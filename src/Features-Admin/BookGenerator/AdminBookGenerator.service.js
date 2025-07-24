// src/Features-Admin/BookGenerator/AdminBookGenerator.service.js
const { Book, BookVariation, BookContentPage, Character, sequelize } = require('../../models');
const visionService = require('../../OpenAI/services/openai.service');
const leonardoService = require('../../OpenAI/services/leonardo.service');
const promptService = require('../../OpenAI/services/prompt.service'); // <-- MUDANÇA: Importado o serviço de prompts
const { downloadAndSaveImage } = require('../../OpenAI/utils/imageDownloader');

const ADMIN_USER_ID = 1;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class AdminBookGeneratorService {

    static async generateBookPreview(bookType, generationData) {
        const { theme, title, characterId, printFormatId, pageCount, location, summary } = generationData;

        if (!bookType || !title || !characterId || !printFormatId || !pageCount || !theme) {
            throw new Error("Dados insuficientes fornecidos para a geração do livro.");
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
                storyPrompt: { theme, location, summary }
            }, { transaction: t });

            let dbBookType = bookType === 'coloring' ? 'colorir' : 'historia';
            if (!['colorir', 'historia'].includes(dbBookType)) {
                throw new Error(`Tipo de livro desconhecido: ${bookType}`);
            }

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

        try {
            console.log(`[AdminGenerator] INICIANDO geração síncrona para o Livro ID: ${book.id}`);
            
            const fullBook = await this.findBookById(book.id); 

            if (bookType === 'coloring') {
                await this.generateColoringBookContent(fullBook);
            } else if (bookType === 'story') {
                throw new Error("A geração de livros de história ainda não foi implementada.");
            }

            await book.update({ status: 'privado' });
            console.log(`[AdminGenerator] Livro ID ${book.id} gerado COM SUCESSO!`);

        } catch (error) {
            console.error(`[AdminGenerator] Erro fatal durante a geração do livro ID ${book.id}:`, error.message);
            await book.update({ status: 'falha_geracao' });
            throw error; 
        }

        return book;
    }

    static async generateColoringBookContent(book) {
        const bookVariation = book.variations[0];
        const character = book.mainCharacter;
        const pageCount = bookVariation.pageCount;
        const theme = book.genre;

        // <-- MUDANÇA: Buscar prompts do banco de dados
        const storylinePromptConfig = await promptService.getPrompt('ADMIN_coloring_storyline');
        const pageGenPromptConfig = await promptService.getPrompt('ADMIN_coloring_page_generation');

        console.log(`[AdminGenerator] Obtendo descrição visual para o personagem ${character.name}...`);
        const characterImageUrl = `${process.env.APP_URL}${character.generatedCharacterUrl}`;
        let characterDescription = 'A cute and friendly character.';
        try {
            // A análise da imagem não precisa de prompt customizável do admin
            const fetchedDescription = await visionService.describeImage(characterImageUrl, "Describe this character for an image generation AI. Focus on visual elements, style, and mood.");
            if (fetchedDescription && !fetchedDescription.toLowerCase().includes("i'm sorry")) {
                characterDescription = fetchedDescription.replace(/\n/g, ' ').replace(/-/g, '').trim();
            }
        } catch (descError) {
            console.warn(`[AdminGenerator] AVISO: Falha ao obter descrição visual. Usando descrição padrão. Erro: ${descError.message}`);
        }

        const sanitizedDescription = visionService.sanitizeDescriptionForColoring(characterDescription);
        console.log(`[AdminGenerator] Descrição sanitizada para prompt: "${sanitizedDescription}"`);

        console.log(`[AdminGenerator] Gerando roteiro para ${pageCount} páginas sobre "${theme}"...`);
        // <-- MUDANÇA: Passar o template do admin para gerar o roteiro
        const pagePrompts = await visionService.generateColoringBookStoryline(
            character.name,
            sanitizedDescription,
            theme,
            pageCount,
            storylinePromptConfig.basePromptText // Passa o prompt do admin aqui
        );

        if (!pagePrompts || pagePrompts.length === 0) {
            throw new Error('A IA não conseguiu gerar o roteiro. O array de prompts de página está vazio.');
        }
        
        console.log(`[AdminGenerator] Roteiro com ${pagePrompts.length} páginas recebido. Iniciando geração das imagens...`);
        
        const pageGenerationPromises = pagePrompts.map((promptDePagina, index) => {
            const pageNumber = index + 1;
            // <-- MUDANÇA: Construir o prompt final do Leonardo usando o template do admin
            const finalLeonardoPrompt = pageGenPromptConfig.basePromptText
              .replace('{{CHARACTER_DESCRIPTION}}', sanitizedDescription)
              .replace('{{PAGE_PROMPT}}', promptDePagina);
              
            return this.generateSingleColoringPage(bookVariation.id, pageNumber, promptDePagina, finalLeonardoPrompt);
        });

        await Promise.all(pageGenerationPromises);
        console.log(`[AdminGenerator] Todas as ${pageCount} páginas do livro ${book.id} foram processadas.`);
    }
    
    // <-- MUDANÇA: Adicionado 'finalLeonardoPrompt' como parâmetro
    static async generateSingleColoringPage(bookVariationId, pageNumber, originalPrompt, finalLeonardoPrompt) {
        const MAX_RETRIES = 3; 
        const RETRY_DELAY = 5000;

        console.log(`[AdminGenerator] Preparando para gerar a página ${pageNumber}: ${originalPrompt}`);
        
        let pageRecord = await BookContentPage.create({
            bookVariationId,
            pageNumber,
            pageType: 'coloring_page',
            illustrationPrompt: originalPrompt, // Salva o prompt original para referência
            status: 'generating',
        }).catch(err => {
            console.error(`[AdminGenerator] Falha crítica ao criar o registro inicial da página ${pageNumber}:`, err.message);
            return null; 
        });

        if (!pageRecord) return;

        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                console.log(`[AdminGenerator] PÁGINA ${pageNumber}, TENTATIVA ${attempt}/${MAX_RETRIES}`);

                // <-- MUDANÇA: Passa o prompt final para o serviço do Leonardo
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

                if (!finalImageUrl) {
                    throw new Error(`Timeout ao gerar a imagem da página ${pageNumber}.`);
                }

                const localPageUrl = await downloadAndSaveImage(finalImageUrl, 'book-pages');

                await pageRecord.update({
                    imageUrl: localPageUrl,
                    status: 'completed',
                });
                console.log(`[AdminGenerator] Página ${pageNumber} concluída com sucesso na tentativa ${attempt}.`);
                
                return;

            } catch (pageError) {
                console.error(`[AdminGenerator] Erro na TENTATIVA ${attempt} de gerar a página ${pageNumber}:`, pageError.message);

                if (attempt === MAX_RETRIES) {
                    console.error(`[AdminGenerator] FALHA FINAL ao gerar a página ${pageNumber} após ${MAX_RETRIES} tentativas.`);
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
                    include: [{
                        model: BookContentPage,
                        as: 'pages',
                    }]
                }
            ],
            order: [
                [{ model: BookVariation, as: 'variations' }, { model: BookContentPage, as: 'pages' }, 'pageNumber', 'ASC']
            ]
        });
        if (!book) throw new Error('Livro não encontrado.');
        return book;
    }
}

module.exports = AdminBookGeneratorService;