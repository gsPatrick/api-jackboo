// src/Features-Admin/BookGenerator/AdminBookGenerator.service.js
const { Book, BookVariation, BookContentPage, Character, sequelize, OpenAISetting } = require('../../models');
const visionService = require('../../OpenAI/services/openai.service');
const leonardoService = require('../../OpenAI/services/leonardo.service');
const { downloadAndSaveImage } = require('../../OpenAI/utils/imageDownloader');

const ADMIN_USER_ID = 1;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class AdminBookGeneratorService {

    static async generateBookPreview(bookType, generationData) {
        const { theme, title, characterId, printFormatId, pageCount, aiTemplateId } = generationData;

        if (!bookType || !title || !characterId || !printFormatId || !pageCount || !theme || !aiTemplateId) {
            throw new Error("Dados insuficientes fornecidos (incluindo Template de IA) para a geração do livro.");
        }
        
        const character = await Character.findByPk(characterId);
        if (!character) throw new Error("Personagem principal não encontrado.");

        let book;
        const t = await sequelize.transaction();
        try {
            book = await Book.create({
                authorId: ADMIN_USER_ID,
                title,
                mainCharacterId: characterId,
                printFormatId,
                status: 'gerando',
                genre: theme,
                storyPrompt: { theme, generationData } // Salva os dados da geração para referência
            }, { transaction: t });

            const dbBookType = bookType === 'coloring' ? 'colorir' : 'historia';

            await BookVariation.create({
                bookId: book.id,
                type: dbBookType,
                format: 'digital_pdf',
                price: 0.00,
                coverUrl: character.generatedCharacterUrl,
                pageCount: parseInt(pageCount),
            }, { transaction: t });

            await t.commit();
        } catch (error) {
            await t.rollback();
            console.error("[AdminGenerator] Erro ao criar a estrutura do livro no DB:", error);
            throw new Error("Falha ao criar os registros iniciais do livro.");
        }

        (async () => {
            try {
                console.log(`[AdminGenerator] INICIANDO geração assíncrona para o Livro ID: ${book.id}`);
                const fullBook = await this.findBookById(book.id); 

                if (bookType === 'coloring') {
                    await this.generateColoringBookContent(fullBook, aiTemplateId);
                } else if (bookType === 'story') {
                    throw new Error("A geração de livros de história ainda não foi implementada com a nova lógica.");
                }

                await book.update({ status: 'privado' });
                console.log(`[AdminGenerator] Livro ID ${book.id} gerado COM SUCESSO!`);

            } catch (error) {
                console.error(`[AdminGenerator] Erro fatal durante a geração do livro ID ${book.id}:`, error.message);
                await book.update({ status: 'falha_geracao' });
            }
        })(); // Self-invoking async function to not block the response

        return book; // Retorna o livro imediatamente
    }

    static async generateColoringBookContent(book, aiTemplateId) {
        const bookVariation = book.variations[0];
        const character = book.mainCharacter;
        const pageCount = bookVariation.pageCount;
        const theme = book.genre;

        const mainTemplate = await OpenAISetting.findByPk(aiTemplateId, {
            include: [{ model: OpenAISetting, as: 'helperPrompt' }]
        });

        if (!mainTemplate) {
            throw new Error(`O template de IA com ID ${aiTemplateId} não foi encontrado.`);
        }

        const characterImageUrl = `${process.env.APP_URL}${character.generatedCharacterUrl}`;
        let characterDescription;

        if (mainTemplate.helperPrompt) {
            console.log(`[AdminGenerator] Usando IA Ajudante "${mainTemplate.helperPrompt.name}" para descrever o personagem.`);
            characterDescription = await visionService.describeImage(characterImageUrl, mainTemplate.helperPrompt.basePromptText);
        } else {
            console.log(`[AdminGenerator] Usando descrição genérica pois não há IA Ajudante associada.`);
            characterDescription = `A simple drawing of ${character.name}.`;
        }
        
        const sanitizedDescription = visionService.sanitizeDescriptionForColoring(characterDescription);
        
        console.log(`[AdminGenerator] Usando template principal "${mainTemplate.name}" para gerar roteiro de ${pageCount} páginas...`);
        const pagePrompts = await visionService.generateColoringBookStoryline(
            character.name,
            sanitizedDescription,
            theme,
            pageCount,
            mainTemplate.basePromptText // O prompt principal do template selecionado dita como criar o roteiro
        );

        if (!pagePrompts || pagePrompts.length === 0) {
            throw new Error('A IA não conseguiu gerar o roteiro das páginas.');
        }
        
        const pageGenerationPromises = pagePrompts.map((promptDePagina, index) => {
            const pageNumber = index + 1;
            // O prompt final do Leonardo é construído manualmente aqui, mas poderia vir de outro template no futuro
            const finalLeonardoPrompt = `line art, coloring book page for kids, ${sanitizedDescription}, ${promptDePagina}, clean lines, no shading, white background`;
            return this.generateSingleColoringPage(bookVariation.id, pageNumber, promptDePagina, finalLeonardoPrompt);
        });

        await Promise.all(pageGenerationPromises);
        console.log(`[AdminGenerator] Todas as ${pageCount} páginas do livro ${book.id} foram processadas.`);
    }
    
    static async generateSingleColoringPage(bookVariationId, pageNumber, originalPrompt, finalLeonardoPrompt) {
        const MAX_RETRIES = 3;
        const RETRY_DELAY = 5000;

        console.log(`[AdminGenerator] Preparando para gerar a página ${pageNumber}: ${originalPrompt}`);
        
        let pageRecord = await BookContentPage.create({
            bookVariationId,
            pageNumber,
            pageType: 'coloring_page',
            illustrationPrompt: originalPrompt,
            status: 'generating',
        }).catch(err => {
            console.error(`[AdminGenerator] Falha crítica ao criar o registro da página ${pageNumber}:`, err.message);
            return null; 
        });

        if (!pageRecord) return;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                console.log(`[AdminGenerator] PÁGINA ${pageNumber}, TENTATIVA ${attempt}/${MAX_RETRIES}`);

                const generationId = await leonardoService.startColoringPageGeneration(finalLeonardoPrompt);
                let finalImageUrl = null;
                const MAX_POLLS = 30;
                for (let poll = 0; poll < MAX_POLLS; poll++) {
                    await sleep(5000);
                    const result = await leonardoService.checkGenerationStatus(generationId);
                    if (result.isComplete) {
                        finalImageUrl = result.imageUrl;
                        break;
                    }
                }

                if (!finalImageUrl) throw new Error(`Timeout ao gerar a imagem da página ${pageNumber}.`);

                const localPageUrl = await downloadAndSaveImage(finalImageUrl, 'book-pages');
                await pageRecord.update({ imageUrl: localPageUrl, status: 'completed' });
                console.log(`[AdminGenerator] Página ${pageNumber} concluída com sucesso.`);
                return;

            } catch (pageError) {
                console.error(`[AdminGenerator] Erro na TENTATIVA ${attempt} de gerar a página ${pageNumber}:`, pageError.message);
                if (attempt === MAX_RETRIES) {
                    await pageRecord.update({
                        status: 'failed',
                        errorDetails: `Falhou após ${MAX_RETRIES} tentativas. Último erro: ${pageError.message}`,
                    });
                    throw pageError;
                }
                await sleep(RETRY_DELAY);
            }
        }
    }

    static async findBookById(bookId) {
        const book = await Book.findByPk(bookId, {
            include: [
                { model: Character, as: 'mainCharacter' },
                {
                    model: BookVariation,
                    as: 'variations',
                    include: [{ model: BookContentPage, as: 'pages' }]
                }
            ],
            order: [[{ model: BookVariation, as: 'variations' }, { model: BookContentPage, as: 'pages' }, 'pageNumber', 'ASC']]
        });
        if (!book) throw new Error('Livro não encontrado.');
        return book;
    }
}

module.exports = new AdminBookGeneratorService;