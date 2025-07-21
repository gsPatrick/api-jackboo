// src/Features-Admin/BookGenerator/AdminBook-Generator.service.js
const { Book, BookVariation, BookContentPage, Character, sequelize } = require('../../models');
const visionService = require('../../OpenAI/services/openai.service');
const leonardoService = require('../../OpenAI/services/leonardo.service');
const { downloadAndSaveImage } = require('../../OpenAI/utils/imageDownloader');

const ADMIN_USER_ID = 1;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class AdminBookGeneratorService {

    static async generateBookPreview(bookType, generationData) {
        const { theme, title, characterId, printFormatId, pageCount } = generationData;

        if (!bookType || !title || !characterId || !printFormatId || !pageCount || !theme) {
            throw new Error("Dados insuficientes fornecidos para a geração do livro.");
        }
        
        const character = await Character.findByPk(characterId);
        if (!character) throw new Error("Personagem principal não encontrado.");

        let book, bookVariation;
        const t = await sequelize.transaction();
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

            let dbBookType = bookType === 'coloring' ? 'colorir' : 'historia';
            if (!['colorir', 'historia'].includes(dbBookType)) {
                throw new Error(`Tipo de livro desconhecido: ${bookType}`);
            }

            bookVariation = await BookVariation.create({
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

        // --- MUDANÇA CRÍTICA: GERAÇÃO SÍNCRONA ---
        // Agora, vamos esperar a conclusão da geração antes de retornar.
        try {
            if (bookType === 'coloring') {
                // `await` garante que a função espere a conclusão
                await this.generateColoringBookContent(book, bookVariation, character.name);
            } else if (bookType === 'story') {
                throw new Error("A geração de livros de história ainda não foi implementada.");
            }

            await book.update({ status: 'privado' }); // Ou 'publicado'
            console.log(`[AdminGenerator] Livro ID ${book.id} gerado com sucesso!`);

        } catch (error) {
            console.error(`[AdminGenerator] Erro fatal durante a geração do livro ID ${book.id}:`, error.message);
            await book.update({ status: 'falha_geracao' });
            // Re-lança o erro para que o controller o capture e envie ao frontend
            throw error; 
        }
        // --- FIM DA MUDANÇA ---

        return book; // Retorna o livro APÓS a geração completa
    }

    static async generateColoringBookContent(book, bookVariation, characterName) {
        const pageCount = bookVariation.pageCount;
        const theme = book.genre;
        
        console.log(`[AdminGenerator] Gerando roteiro para ${pageCount} páginas sobre "${theme}"...`);
        const pagePrompts = await visionService.generateColoringBookStoryline(
            characterName,
            theme, 
            pageCount
        );

        // Gera as páginas em paralelo para acelerar o processo
        const pageGenerationPromises = pagePrompts.map(async (prompt, index) => {
            const pageNumber = index + 1;
            console.log(`[AdminGenerator] Iniciando geração da página ${pageNumber}/${pageCount}: ${prompt}`);

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
                    bookVariationId: bookVariation.id,
                    pageNumber,
                    pageType: 'coloring_page',
                    imageUrl: localPageUrl,
                    illustrationPrompt: prompt,
                });
                console.log(`[AdminGenerator] Página ${pageNumber}/${pageCount} concluída com sucesso.`);
            } catch (pageError) {
                console.error(`[AdminGenerator] Erro ao gerar a página ${pageNumber}:`, pageError.message);
                // Mesmo com erro, continuamos para não parar o livro inteiro.
                // Poderíamos salvar a página com status de 'failed' aqui.
            }
        });

        // Espera todas as promessas de geração de página serem resolvidas
        await Promise.all(pageGenerationPromises);
    }

     static async findBookById(bookId) {
        const book = await Book.findByPk(bookId, {
            include: [{ 
                model: BookVariation, 
                as: 'variations',
                include: [{
                    model: BookContentPage,
                    as: 'pages', // Certifique-se que o 'as' está correto
                }]
            }],
            order: [
                [{ model: BookVariation, as: 'variations' }, { model: BookContentPage, as: 'pages' }, 'pageNumber', 'ASC']
            ]
        });

        if (!book) throw new Error("Livro não encontrado.");
        return book;
    }
}

module.exports = AdminBookGeneratorService;