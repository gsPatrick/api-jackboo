// src/Features/Content/BookCreation.service.js
const { bookGenerationQueue } = require('../../Jobs/queue'); // <-- NOVO: Importa a fila
const { Book, BookTemplate, BookPage, Character, sequelize } = require('../../models');
const imageGenerationService = require('../../OpenAI/services/imageGeneration.service');
const PDFGenerator = require('../../Utils/PDFGenerator');

// src/Features/Content/BookCreation.service.js (agora atuando como o worker)

// ... importações

class BookCreationService {
    /**
     * Lógica que executa o processo SIMPLIFICADO. Chamado pelo worker.
     * @private
     */
    static async _processSimplifiedBookGeneration(bookId, structure, context, referenceImageUrl) {
        let book;
        try {
            book = await Book.findByPk(bookId);
            if (!book || book.status !== 'gerando') return;

            console.log(`[Worker/Simplified] Gerando livro "${book.title}"`);
            let currentPageNumber = 1;

            for (const item of structure) {
                for (let i = 0; i < (item.repeats || 1); i++) {
                    const pageContext = { ...context, SCENE_SUMMARY: item.scene_summary || '' };
                    
                    // Constrói o prompt final para esta página
                    const finalPrompt = constructPrompt(item.promptTemplate, [], pageContext);
                    
                    const page = await BookPage.create({
                        bookId,
                        pageNumber: currentPageNumber++,
                        status: 'generating',
                        pageType: item.type,
                    });

                    try {
                        let generatedImageUrl;
                        if (item.type === 'text') {
                            // Gerar texto com GPT e depois converter para imagem
                            const textContent = await textGenerationService.generate(finalPrompt); // Serviço a ser criado
                            generatedImageUrl = await TextToImageService.generateImage({ text: textContent });
                        } else {
                            // Gerar imagem com DALL-E
                            generatedImageUrl = await imageGenerationService.generateWithImagePrompt(finalPrompt, referenceImageUrl);
                        }
                        
                        await page.update({ generatedImageUrl, status: 'completed' });
                        console.log(`[Worker/Simplified] Página ${page.pageNumber} gerada.`);

                    } catch (pageError) {
                        await page.update({ status: 'failed', errorDetails: pageError.message });
                        console.error(`[Worker/Simplified] Falha na página ${page.pageNumber}:`, pageError.message);
                    }
                }
            }

            await PDFGenerator.generatePdfFromBook(bookId);
            await book.update({ status: 'privado' });
            console.log(`[Worker/Simplified] Livro ID ${bookId} finalizado.`);

        } catch (error) {
            console.error(`[Worker/Simplified] Erro fatal no livro ${bookId}:`, error);
            if (book) await book.update({ status: 'falha_geracao' });
            throw error;
        }
    }
}

module.exports = BookCreationService;