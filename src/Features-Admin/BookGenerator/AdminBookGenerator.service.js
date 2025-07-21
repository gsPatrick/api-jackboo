// src/Features-Admin/BookGenerator/AdminBookGenerator.service.js
const { Book, BookVariation, BookContentPage, Character, sequelize } = require('../../models');
const visionService = require('../../OpenAI/services/openai.service');
const leonardoService = require('../../OpenAI/services/leonardo.service');
const { downloadAndSaveImage } = require('../../OpenAI/utils/imageDownloader');

const ADMIN_USER_ID = 1;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class AdminBookGeneratorService {

    // ... (método generateBookPreview permanece o mesmo) ...
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

        console.log(`[AdminGenerator] Obtendo descrição visual para o personagem ${character.name}...`);
        const characterImageUrl = `${process.env.APP_URL}${character.generatedCharacterUrl}`;
        let characterDescription = 'Um personagem fofo e amigável.';
        try {
            const fetchedDescription = await visionService.describeImage(characterImageUrl);
            if (fetchedDescription && !fetchedDescription.toLowerCase().includes("i'm sorry")) {
                characterDescription = fetchedDescription;
            }
        } catch (descError) {
            console.warn(`[AdminGenerator] AVISO: Falha ao obter descrição visual. Usando descrição padrão. Erro: ${descError.message}`);
        }

        console.log(`[AdminGenerator] Gerando roteiro para ${pageCount} páginas sobre "${theme}"...`);
        
        // --- CORREÇÃO CRÍTICA: Passando os argumentos na ordem correta para a função corrigida ---
        const pagePrompts = await visionService.generateColoringBookStoryline(
            character.name,
            characterDescription,
            theme,
            pageCount
        );

        // --- CORREÇÃO: Adicionando verificação para garantir que o roteiro foi gerado ---
        if (!pagePrompts || pagePrompts.length === 0) {
            throw new Error('A IA não conseguiu gerar o roteiro. O array de prompts de página está vazio.');
        }

        console.log(`[AdminGenerator] Roteiro com ${pagePrompts.length} páginas recebido. Iniciando geração das imagens...`);

        const pageGenerationPromises = pagePrompts.map((prompt, index) => {
            const pageNumber = index + 1;
            return this.generateSingleColoringPage(bookVariation.id, pageNumber, prompt);
        });

        await Promise.all(pageGenerationPromises);
        console.log(`[AdminGenerator] Todas as ${pageCount} páginas do livro ${book.id} foram processadas.`);
    }
    
   static async generateSingleColoringPage(bookVariationId, pageNumber, prompt) {
        console.log(`[AdminGenerator] Preparando para gerar a página ${pageNumber}: ${prompt}`);
        
        // 1. Cria o registro da página no banco de dados com status 'generating'
        let pageRecord = await BookContentPage.create({
            bookVariationId,
            pageNumber,
            pageType: 'coloring_page',
            illustrationPrompt: prompt,
            status: 'generating',
        }).catch(err => {
            console.error(`[AdminGenerator] Falha crítica ao criar o registro inicial da página ${pageNumber}:`, err.message);
            // Se nem conseguirmos criar o registro, não há o que fazer.
            return null; 
        });

        if (!pageRecord) return; // Aborta se a criação do registro falhou

        try {
            // 2. Inicia a geração da imagem na API externa
            const generationId = await leonardoService.startColoringPageGeneration(prompt);

            // 3. Aguarda o resultado (Polling)
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

            // 4. Baixa a imagem e atualiza o registro para 'completed'
            const localPageUrl = await downloadAndSaveImage(finalImageUrl, 'book-pages');

            await pageRecord.update({
                imageUrl: localPageUrl,
                status: 'completed',
            });
            console.log(`[AdminGenerator] Página ${pageNumber} concluída com sucesso.`);

        } catch (pageError) {
            console.error(`[AdminGenerator] Erro ao gerar a página ${pageNumber}:`, pageError.message);
            // 5. Em caso de erro, atualiza o registro para 'failed'
            await pageRecord.update({
                status: 'failed',
                errorDetails: pageError.message,
            });
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