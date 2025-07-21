// src/Features-Admin/BookGenerator/AdminBookGenerator.service.js
const { Book, BookVariation, BookContentPage, Character, sequelize } = require('../../models');
const visionService = require('../../OpenAI/services/openai.service');
const leonardoService = require('../../OpenAI/services/leonardo.service');
const { downloadAndSaveImage } = require('../../OpenAI/utils/imageDownloader');

const ADMIN_USER_ID = 1; // ID do usuário "Sistema/JackBoo"
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class AdminBookGeneratorService {

    /**
     * Ponto de entrada para a criação de livros pelo admin.
     * @param {string} bookType - 'coloring' ou 'story'.
     * @param {object} generationData - Dados do formulário do admin.
     * @returns {Book} O objeto do livro recém-criado.
     */
    static async generateBookPreview(bookType, generationData) {
        const { theme, title, characterId, printFormatId, pageCount } = generationData;

        // Validações
        if (!bookType || !title || !characterId || !printFormatId || !pageCount || !theme) {
            throw new Error("Dados insuficientes fornecidos para a geração do livro.");
        }
        
        const character = await Character.findByPk(characterId);
        if (!character) throw new Error("Personagem principal não encontrado.");

        // --- Criação da Estrutura Inicial do Livro ---
        const t = await sequelize.transaction();
        let book, bookVariation;
        try {
            book = await Book.create({
                authorId: ADMIN_USER_ID,
                title,
                mainCharacterId: characterId,
                printFormatId,
                status: 'gerando',
                genre: theme,
                storyPrompt: { theme }
            }, { transaction: t });

            bookVariation = await BookVariation.create({
                bookId: book.id,
                type: bookType,
                format: 'digital_pdf',
                price: 0.00,
                coverUrl: character.generatedCharacterUrl, // Capa temporária
                pageCount: parseInt(pageCount),
            }, { transaction: t });

            await t.commit();
        } catch (error) {
            await t.rollback();
            console.error("[AdminGenerator] Erro ao criar a estrutura do livro no DB:", error);
            throw new Error("Falha ao criar os registros iniciais do livro.");
        }

        // --- Geração Assíncrona do Conteúdo (Fire-and-Forget) ---
        (async () => {
            try {
                if (bookType === 'coloring') {
                    await this.generateColoringBookContent(book, bookVariation, character);
                } else if (bookType === 'story') {
                    // TODO: Implementar lógica de geração para livros de história
                    throw new Error("A geração de livros de história ainda não foi implementada.");
                }

                // Sucesso!
                await book.update({ status: 'privado' }); // Ou 'publicado'
                console.log(`[AdminGenerator] Livro ID ${book.id} gerado com sucesso!`);

            } catch (error) {
                console.error(`[AdminGenerator] Erro fatal na thread de geração do livro ID ${book.id}:`, error.message);
                await book.update({ status: 'falha_geracao' });
            }
        })();

        // Retorna o livro imediatamente para que o frontend possa redirecionar
        return book;
    }

    /**
     * Lógica específica para gerar o conteúdo de um livro de colorir.
     */
    static async generateColoringBookContent(book, bookVariation, character) {
        const pageCount = bookVariation.pageCount;
        const theme = book.genre; // Usamos o gênero como tema
        const characterImageUrl = `${process.env.APP_URL}${character.generatedCharacterUrl}`;

        // 1. Gerar o roteiro com todos os prompts de página usando o VisionService
        console.log(`[AdminGenerator] Gerando roteiro para ${pageCount} páginas sobre "${theme}"...`);
        const pagePrompts = await visionService.generateColoringBookStoryline(
            { name: character.name, imageUrl: characterImageUrl }, 
            theme, 
            pageCount
        );

        // 2. Gerar cada página individualmente em um loop
        for (let i = 0; i < pagePrompts.length; i++) {
            const pageNumber = i + 1;
            const prompt = pagePrompts[i];
            console.log(`[AdminGenerator] Gerando página ${pageNumber}/${pageCount}: ${prompt}`);

            // Inicia a geração no Leonardo
            const generationId = await leonardoService.startColoringPageGeneration(prompt);

            // Polling para o resultado
            let finalImageUrl = null;
            const MAX_POLLS = 30; // 30 * 5s = 2.5 minutos de espera máxima
            for (let poll = 0; poll < MAX_POLLS; poll++) {
                await sleep(5000); // Espera 5 segundos
                const result = await leonardoService.checkGenerationStatus(generationId);
                if (result.isComplete) {
                    finalImageUrl = result.imageUrl;
                    break;
                }
            }

            if (!finalImageUrl) {
                throw new Error(`A geração da página ${pageNumber} demorou muito para responder.`);
            }

            // Baixa a imagem gerada e salva localmente
            const localPageUrl = await downloadAndSaveImage(finalImageUrl, 'book-pages');

            // Salva a página no banco de dados
            await BookContentPage.create({
                bookVariationId: bookVariation.id,
                pageNumber,
                pageType: 'coloring_page',
                imageUrl: localPageUrl,
                illustrationPrompt: prompt,
            });
        }
    }

    // A função antiga 'generateSinglePageContent' foi removida.
    // Você pode adicionar uma nova função 'regeneratePage' aqui se necessário.
}


module.exports = AdminBookGeneratorService;