// src/Features-Admin/BookGenerator/AdminBookGenerator.service.js
const { Book, BookVariation, BookContentPage, Character, sequelize } = require('../../models');
const visionService = require('../../OpenAI/services/openai.service');
const leonardoService = require('../../OpenAI/services/leonardo.service');
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
                storyPrompt: { theme, location, summary }
            }, { transaction: t });

            let dbBookType;
            if (bookType === 'coloring') {
                dbBookType = 'colorir';
            } else if (bookType === 'story') {
                dbBookType = 'historia';
            } else {
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

        (async () => {
            try {
                if (bookType === 'coloring') {
                    // --- CORREÇÃO AQUI ---
                    // Passa `character.name` (uma string) em vez do objeto `character` completo
                    await this.generateColoringBookContent(book, bookVariation, character.name);
                    // --- FIM DA CORREÇÃO ---
                } else if (bookType === 'story') {
                    throw new Error("A geração de livros de história ainda não foi implementada.");
                }

                await book.update({ status: 'privado' });
                console.log(`[AdminGenerator] Livro ID ${book.id} gerado com sucesso!`);

            } catch (error) {
                console.error(`[AdminGenerator] Erro fatal na thread de geração do livro ID ${book.id}:`, error.message);
                await book.update({ status: 'falha_geracao' });
            }
        })();

        return book;
    }

    static async generateColoringBookContent(book, bookVariation, characterName) { // Agora recebe characterName
        const pageCount = bookVariation.pageCount;
        const theme = book.genre;
        
        console.log(`[AdminGenerator] Gerando roteiro para ${pageCount} páginas sobre "${theme}"...`);
        const pagePrompts = await visionService.generateColoringBookStoryline(
            characterName, // Já é uma string
            theme, 
            pageCount
        );

        for (let i = 0; i < pagePrompts.length; i++) {
            const pageNumber = i + 1;
            const prompt = pagePrompts[i];
            console.log(`[AdminGenerator] Gerando página ${pageNumber}/${pageCount}: ${prompt}`);

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
                throw new Error(`A geração da página ${pageNumber} demorou muito para responder.`);
            }

            const localPageUrl = await downloadAndSaveImage(finalImageUrl, 'book-pages');

            await BookContentPage.create({
                bookVariationId: bookVariation.id,
                pageNumber,
                pageType: 'coloring_page',
                imageUrl: localPageUrl,
                illustrationPrompt: prompt,
            });
        }
    }
}

module.exports = AdminBookGeneratorService;