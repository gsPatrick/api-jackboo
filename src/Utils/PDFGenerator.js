// src/Utils/PDFGenerator.js
const { PDFDocument, rgb, PageSizes, cm } = require('pdf-lib'); // <-- Adicione cm e PageSizes
const fs = require('fs/promises');
const path = require('path');
const axios = require('axios');
const { Book, BookPage, PrintFormat } = require('../models'); // <-- Adicione PrintFormat

const PDF_OUTPUT_DIR = path.join(__dirname, '../../uploads/final-books');

class PDFGenerator {
  /**
   * Converte centímetros para pontos (unidade do PDF). 1 cm = 28.3465 pontos.
   * @param {number} centimeters - Valor em cm.
   * @returns {number} Valor em pontos.
   */
  static cmToPoints(centimeters) {
    return centimeters * 28.3465;
  }

  static async generatePdfFromBook(bookId) {
    try {
      console.log(`[PDF] Iniciando geração do PDF para o livro ID: ${bookId}`);
      await fs.mkdir(PDF_OUTPUT_DIR, { recursive: true });

      const book = await Book.findByPk(bookId, {
        include: [
          { model: BookPage, as: 'pages', where: { status: 'completed' }, order: [['pageNumber', 'ASC']] },
          { model: PrintFormat, as: 'printFormat' } // <-- Inclui o formato de impressão
        ]
      });

      if (!book || !book.pages || book.pages.length === 0) {
        throw new Error(`Nenhuma página completa encontrada para gerar o PDF do livro ID: ${bookId}`);
      }
      
      // Se não houver formato de impressão, usa um padrão A4
      const printFormat = book.printFormat;
      if (!printFormat) {
          console.warn(`[PDF] Livro ID ${bookId} não tem formato de impressão. Usando A4 como padrão.`);
          // Aqui você pode decidir lançar um erro ou usar um padrão.
          // throw new Error('Formato de impressão não definido para este livro.');
      }

      const pdfDoc = await PDFDocument.create();

      for (const page of book.pages) {
        const imageResponse = await axios.get(page.generatedImageUrl, { responseType: 'arraybuffer' });
        const imageBytes = imageResponse.data;
        
        let embeddedImage;
        if (page.generatedImageUrl.endsWith('.png')) {
          embeddedImage = await pdfDoc.embedPng(imageBytes);
        } else {
          embeddedImage = await pdfDoc.embedJpg(imageBytes);
        }
        
        // Determina as dimensões da página do PDF com base no formato
        let pdfPageWidth, pdfPageHeight, marginPoints;
        const isCover = page.pageNumber === 1 || page.pageNumber === book.pages.length; // Simplificação para capa/contracapa

        if (printFormat) {
          pdfPageWidth = this.cmToPoints(isCover ? printFormat.coverWidth : printFormat.pageWidth);
          pdfPageHeight = this.cmToPoints(isCover ? printFormat.coverHeight : printFormat.pageHeight);
          marginPoints = this.cmToPoints(printFormat.margin);
        } else {
          // Fallback para A4 se não houver formato
          [pdfPageWidth, pdfPageHeight] = PageSizes.A4;
          marginPoints = this.cmToPoints(1.5);
        }

        const pdfPage = pdfDoc.addPage([pdfPageWidth, pdfPageHeight]);
        
        // Área útil da página (descontando as margens)
        const drawableWidth = pdfPageWidth - (2 * marginPoints);
        const drawableHeight = pdfPageHeight - (2 * marginPoints);
        
        // Calcula a escala da imagem para caber na área útil, mantendo a proporção
        const imageAspectRatio = embeddedImage.width / embeddedImage.height;
        const drawableAspectRatio = drawableWidth / drawableHeight;
        
        let finalWidth, finalHeight;
        if (imageAspectRatio > drawableAspectRatio) {
          finalWidth = drawableWidth;
          finalHeight = drawableWidth / imageAspectRatio;
        } else {
          finalHeight = drawableHeight;
          finalWidth = drawableHeight * imageAspectRatio;
        }
        
        // Calcula a posição para centralizar a imagem
        const x = (pdfPageWidth - finalWidth) / 2;
        const y = (pdfPageHeight - finalHeight) / 2;
        
        pdfPage.drawImage(embeddedImage, { x, y, width: finalWidth, height: finalHeight });
      }

      const pdfBytes = await pdfDoc.save();
      const pdfFilename = `book-${bookId}-${Date.now()}.pdf`;
      const pdfPath = path.join(PDF_OUTPUT_DIR, pdfFilename);

      await fs.writeFile(pdfPath, pdfBytes);
      console.log(`[PDF] PDF salvo com sucesso em: ${pdfPath}`);

      const finalPdfUrl = `/uploads/final-books/${pdfFilename}`;
      await book.update({ finalPdfUrl });
      return finalPdfUrl;

    } catch (error) {
      console.error(`[PDF] Erro ao gerar PDF para o livro ID: ${bookId}:`, error);
      await Book.update({ status: 'falha_geracao' }, { where: { id: bookId } });
      throw error;
    }
  }
}

module.exports = PDFGenerator;