// src/Features/Content/BookCreation.service.js
const { bookGenerationQueue } = require('../../Jobs/queue'); // <-- NOVO: Importa a fila
const { Book, BookTemplate, BookPage, Character, sequelize } = require('../../../models');
const imageGenerationService = require('../../OpenAI/services/imageGeneration.service');
const PDFGenerator = require('../../Utils/PDFGenerator');

class BookCreationService {
  /**
   * Adiciona a tarefa de geração do livro à fila do BullMQ.
   * Retorna imediatamente, sem esperar o término do processo.
   */
  static async startBookGeneration(bookId, userInputs) {
    // Adiciona o job à fila com os dados necessários
    await bookGenerationQueue.add('generate-book', {
      bookId: bookId,
      userInputs: userInputs
    });
    console.log(`[BookCreation] Job para gerar o livro ID ${bookId} adicionado à fila.`);
  }

  /**
   * Lógica interna que executa o processo.
   * Este método agora é chamado APENAS pelo worker do BullMQ.
   * O código interno deste método permanece exatamente o mesmo de antes.
   * @private
   */
  static async _processBookGeneration(bookId, userInputs) {
    let book;
    try {
      book = await Book.findByPk(bookId, {
        include: [
          { 
            model: BookTemplate, 
            as: 'template', 
            include: [{ model: PageTemplate, as: 'pageTemplates', include: ['aiSetting'] }] 
          },
          { model: Character, as: 'mainCharacter' }
        ]
      });

      if (!book || book.status !== 'gerando') {
        console.warn(`[BookCreation/Worker] Livro ID ${bookId} não encontrado ou não está no status 'gerando'. Abortando.`);
        return;
      }
      
      console.log(`[BookCreation/Worker] Iniciando geração para o livro "${book.title}" (ID: ${bookId})`);
      
      const pagesToGenerate = [];
      let currentPageNumber = 1;
      const sortedPageTemplates = book.template.pageTemplates.sort((a, b) => a.order - b.order);

      for (const pageTemplate of sortedPageTemplates) {
        for (let i = 0; i < pageTemplate.repeatCount; i++) {
          const bookPage = await BookPage.create({
            bookId: book.id,
            pageTemplateId: pageTemplate.id,
            pageNumber: currentPageNumber++,
            status: 'pending',
            userInputJson: userInputs
          });
          pagesToGenerate.push(bookPage);
        }
      }
      
      for (const page of pagesToGenerate) {
        try {
          await page.update({ status: 'generating' });
          const pageTemplate = sortedPageTemplates.find(pt => pt.id === page.pageTemplateId);

          if (!pageTemplate.aiSetting) {
            throw new Error(`A página de tipo "${pageTemplate.pageType}" (ordem ${pageTemplate.order}) não tem uma configuração de IA associada.`);
          }
          
          const generatedImageUrl = await imageGenerationService.generateFromTemplate({
              aiSettingId: pageTemplate.aiSetting.id,
              book,
              userInputs,
              page
          });
          
          await page.update({ generatedImageUrl, status: 'completed' });
          console.log(`[BookCreation/Worker] Página ${page.pageNumber} do livro ${bookId} gerada com sucesso.`);
        } catch (error) {
          console.error(`[BookCreation/Worker] Falha ao gerar página ${page.pageNumber} do livro ${bookId}:`, error.message);
          await page.update({ status: 'failed', errorDetails: error.message });
        }
      }
      console.log(`[BookCreation/Worker] Geração de todas as imagens para o livro ${bookId} finalizada.`);

      try {
        await PDFGenerator.generatePdfFromBook(bookId);
      } catch (pdfError) {
        console.error(`[BookCreation/Worker] Falha na etapa de geração do PDF para o livro ${bookId}.`, pdfError);
      }

      await book.update({ status: 'privado' });
      console.log(`[BookCreation/Worker] Processo do livro ${bookId} concluído. Status alterado para 'privado'.`);
      
    } catch (error) {
      console.error(`[BookCreation/Worker] Erro fatal no processo de criação do livro ${bookId}:`, error);
      if (book) {
        await book.update({ status: 'falha_geracao' });
      }
      // Relança o erro para o BullMQ saber que a tarefa falhou.
      throw error;
    }
  }
}

module.exports = BookCreationService;