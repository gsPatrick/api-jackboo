// src/Features-Admin/BookGenerator/AdminBookGenerator.service.js
const { Book, BookVariation, BookContentPage, Character, sequelize } = require('../../models');
const visionService = require('../../OpenAI/services/openai.service');
const leonardoService = require('../../OpenAI/services/leonardo.service');
const { downloadAndSaveImage } = require('../../OpenAI/utils/imageDownloader');

const ADMIN_USER_ID = 1;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class AdminBookGeneratorService {

    /**
     * Ponto de entrada para a criação de livros pelo admin.
     * O processo agora é síncrono: a função só retorna após a conclusão de todas as etapas.
     * @param {string} bookType - 'coloring' ou 'story'.
     * @param {object} generationData - Dados do formulário do admin.
     * @returns {Book} O objeto do livro recém-criado.
     */
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

        // --- GERAÇÃO SÍNCRONA ---
        // A função agora espera a conclusão da geração antes de retornar.
        try {
            console.log(`[AdminGenerator] INICIANDO geração síncrona para o Livro ID: ${book.id}`);
            
            const fullBook = await this.findBookById(book.id); // Busca o livro com as associações

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
            throw error; // Re-lança o erro para o controller
        }

        return book; // Retorna o livro APÓS a geração completa
    }

    /**
     * Lógica específica para gerar o conteúdo de um livro de colorir.
     * @param {Book} book - A instância completa do livro com suas associações.
     */
    static async generateColoringBookContent(book) {
        const bookVariation = book.variations[0];
        const character = book.mainCharacter;
        const pageCount = bookVariation.pageCount;
        const theme = book.genre;

        // 1. Obter a descrição visual do personagem
        console.log(`[AdminGenerator] Obtendo descrição visual para o personagem ${character.name}...`);
        const characterImageUrl = `${process.env.APP_URL}${character.generatedCharacterUrl}`;
        const characterDescription = await visionService.describeImage(characterImageUrl);

        // 2. Gerar o roteiro UMA ÚNICA VEZ, agora com a descrição
        console.log(`[AdminGenerator] Gerando roteiro para ${pageCount} páginas sobre "${theme}"...`);
        const pagePrompts = await visionService.generateColoringBookStoryline(
            character.name,
            characterDescription, // Passa a descrição para a IA
            theme, 
            pageCount
        );

        // 3. Criar um array de promessas para gerar todas as páginas em paralelo
        const pageGenerationPromises = pagePrompts.map((prompt, index) => {
            const pageNumber = index + 1;
            return this.generateSingleColoringPage(bookVariation.id, pageNumber, prompt);
        });

        // 4. Espera todas as páginas serem geradas
        await Promise.all(pageGenerationPromises);
        console.log(`[AdminGenerator] Todas as ${pageCount} páginas do livro ${book.id} foram processadas.`);
    }

    /**
     * Função auxiliar que encapsula a lógica de geração de uma única página.
     */
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
            // Salva um registro de falha para que possa ser regerado depois
            await BookContentPage.create({
                bookVariationId,
                pageNumber,
                pageType: 'coloring_page',
                illustrationPrompt: prompt,
                // Adicione 'status' e 'errorDetails' ao seu model BookContentPage para um melhor tratamento
            }).catch(e => console.error("Falha ao salvar o registro de erro da página:", e));
        }
    }

    /**
     * Função para buscar um livro completo por ID, usada internamente e pelo controller de preview.
     */
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