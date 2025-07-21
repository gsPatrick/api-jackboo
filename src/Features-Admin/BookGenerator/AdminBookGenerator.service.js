// src/Features-Admin/BookGenerator/AdminBookGenerator.service.js
const { Book, BookVariation, BookContentPage, Character, sequelize } = require('../../models');
const visionService = require('../../OpenAI/services/openai.service');
const leonardoService = require('../../OpenAI/services/leonardo.service');
const { downloadAndSaveImage } = require('../../OpenAI/utils/imageDownloader');

const ADMIN_USER_ID = 1;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class AdminBookGeneratorService {

    static async generateBookPreview(bookType, generationData) {
        const { theme, title, characterId, printFormatId, pageCount } = generationData;

        // Validações
        if (!bookType || !title || !characterId || !printFormatId || !pageCount || !theme) {
            throw new Error("Dados insuficientes fornecidos para a geração do livro.");
        }
        
        const character = await Character.findByPk(characterId);
        if (!character) throw new Error("Personagem principal não encontrado.");

        // --- Criação da Estrutura Inicial do Livro ---
        let book; // Declarar fora para ser acessível em todo o escopo
        try {
            await sequelize.transaction(async (t) => {
                book = await Book.create({
                    authorId: ADMIN_USER_ID,
                    title,
                    mainCharacterId: characterId,
                    printFormatId,
                    status: 'gerando',
                    genre: theme,
                    storyPrompt: { theme }
                }, { transaction: t });

                let dbBookType = bookType === 'coloring' ? 'colorir' : 'historia';

                await BookVariation.create({
                    bookId: book.id,
                    type: dbBookType,
                    format: 'digital_pdf',
                    price: 0.00,
                    coverUrl: character.generatedCharacterUrl,
                    pageCount: parseInt(pageCount),
                }, { transaction: t });
            });
        } catch (error) {
            console.error("[AdminGenerator] Erro ao criar a estrutura do livro no DB:", error);
            throw new Error("Falha ao criar os registros iniciais do livro.");
        }

        // --- Geração Síncrona do Conteúdo ---
        try {
            // Buscamos novamente o livro com suas associações para passar para a próxima função
            const fullBook = await this.findBookById(book.id); 

            if (bookType === 'coloring') {
                await this.generateColoringBookContent(fullBook);
            } else if (bookType === 'story') {
                throw new Error("A geração de livros de história ainda não foi implementada.");
            }

            await book.update({ status: 'privado' });
            console.log(`[AdminGenerator] Livro ID ${book.id} gerado com sucesso!`);

        } catch (error) {
            console.error(`[AdminGenerator] Erro fatal durante a geração do livro ID ${book.id}:`, error.message);
            await book.update({ status: 'falha_geracao' });
            throw error; 
        }

        return book;
    }

    static async generateColoringBookContent(book) {
        const bookVariation = book.variations[0]; // Assumindo a primeira variação
        const character = book.mainCharacter;
        const pageCount = bookVariation.pageCount;
        const theme = book.genre;

        // 1. Gerar o roteiro UMA ÚNICA VEZ
        console.log(`[AdminGenerator] Gerando roteiro para ${pageCount} páginas sobre "${theme}"...`);
        const pagePrompts = await visionService.generateColoringBookStoryline(
            character.name,
            theme, 
            pageCount
        );

        // 2. Criar um array de promessas para gerar todas as páginas em paralelo
        const pageGenerationPromises = pagePrompts.map((prompt, index) => {
            const pageNumber = index + 1;
            // Retorna a promessa da geração completa da página
            return this.generateSingleColoringPage(bookVariation.id, pageNumber, prompt);
        });

        // 3. Espera todas as páginas serem geradas
        await Promise.all(pageGenerationPromises);
        console.log(`[AdminGenerator] Todas as ${pageCount} páginas do livro ${book.id} foram processadas.`);
    }

    // NOVA FUNÇÃO AUXILIAR para gerar uma única página
    static async generateSingleColoringPage(bookVariationId, pageNumber, prompt) {
        console.log(`[AdminGenerator] Iniciando geração da página ${pageNumber}: ${prompt}`);
        try {
            const generationId = await leonardoService.startColoringPageGeneration(prompt);

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

            await BookContentPage.create({
                bookVariationId,
                pageNumber,
                pageType: 'coloring_page',
                imageUrl: localPageUrl,
                illustrationPrompt: prompt,
            });
            console.log(`[AdminGenerator] Página ${pageNumber} concluída com sucesso.`);
        } catch (pageError) {
            console.error(`[AdminGenerator] Erro ao gerar a página ${pageNumber}:`, pageError.message);
            // Salva a página com status de falha (opcional, mas recomendado)
            await BookContentPage.create({
                bookVariationId,
                pageNumber,
                pageType: 'coloring_page',
                illustrationPrompt: prompt,
                // Adicione um campo 'status' e 'errorDetails' ao seu model BookContentPage para isso
            }).catch(e => console.error("Falha ao salvar o registro de erro da página:", e));
        }
    }

    // Função para buscar o livro completo
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