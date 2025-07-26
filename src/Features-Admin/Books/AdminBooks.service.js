// src/Features-Admin/BookGenerator/AdminBookGenerator.service.js
const { Book, BookVariation, BookContentPage, Character, sequelize } = require('../../models');
const visionService = require('../../OpenAI/services/openai.service');
const leonardoService = require('../../OpenAI/services/leonardo.service');
const { downloadAndSaveImage } = require('../../OpenAI/utils/imageDownloader');

const ADMIN_USER_ID = 1;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class AdminBookGeneratorService {

    static async generateBookPreview(bookType, generationData) {
        const { theme, title, characterId, printFormatId, pageCount, elementId } = generationData;

        if (!bookType || !title || !characterId || !printFormatId || !pageCount || !theme || !elementId) {
            throw new Error("Dados insuficientes fornecidos (incluindo Elemento de Estilo) para a geração do livro.");
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
                storyPrompt: { theme, generationData }
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
                    await this.generateColoringBookContent(fullBook, elementId);
                } else if (bookType === 'story') {
                    // Implementar a lógica para livro de história aqui, se necessário.
                    throw new Error("A geração de livros de história pelo admin ainda não foi implementada com a nova lógica.");
                }

                await book.update({ status: 'privado' });
                console.log(`[AdminGenerator] Livro ID ${book.id} gerado COM SUCESSO!`);

            } catch (error) {
                console.error(`[AdminGenerator] Erro fatal durante a geração do livro ID ${book.id}:`, error.message);
                await book.update({ status: 'falha_geracao' });
            }
        })();

        return book;
    }

    static async generateColoringBookContent(book, elementId) {
        const bookVariation = book.variations[0];
        const character = book.mainCharacter;
        const pageCount = bookVariation.pageCount;
        const theme = book.genre;

        if (!character.description) {
            throw new Error(`O personagem ID ${character.id} não possui uma descrição gerada por IA.`);
        }
        
        const characterDescription = character.description;
        const sanitizedDescription = visionService.sanitizeDescriptionForColoring(characterDescription);
        
        console.log(`[AdminGenerator] Usando a descrição do personagem para gerar roteiro de ${pageCount} páginas...`);
        const pagePrompts = await visionService.generateColoringBookStoryline(
            character.name,
            sanitizedDescription,
            theme,
            pageCount,
        );

        if (!pagePrompts || pagePrompts.length === 0) {
            throw new Error('A IA não conseguiu gerar o roteiro das páginas.');
        }
        
        const pageGenerationPromises = pagePrompts.map((promptDePagina, index) => {
            const pageNumber = index + 1;
            const finalLeonardoPrompt = `página de livro de colorir, arte de linha, ${sanitizedDescription}, ${promptDePagina}, linhas limpas, sem sombreamento, fundo branco`;
            return this.generateSingleColoringPage(bookVariation.id, pageNumber, promptDePagina, finalLeonardoPrompt, elementId);
        });

        await Promise.all(pageGenerationPromises);
        console.log(`[AdminGenerator] Todas as ${pageCount} páginas do livro ${book.id} foram processadas.`);
    }
    
    static async generateSingleColoringPage(bookVariationId, pageNumber, originalPrompt, finalLeonardoPrompt, elementId) {
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

                const generationId = await leonardoService.startColoringPageGeneration(finalLeonardoPrompt, elementId);
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