// src/Features-Admin/BookGenerator/AdminBookGenerator.controller.js
const AdminBookGeneratorService = require('./AdminBookGenerator.service');

class AdminBookGeneratorController {
    async generatePreview(req, res) {
        try {
            const { bookType, ...generationData } = req.body;
            const book = await AdminBookGeneratorService.generateBookPreview(bookType, generationData);
            res.status(200).json(book);
        } catch (error) {
            console.error("Erro ao gerar preview do livro:", error);
            res.status(500).json({ message: 'Falha ao gerar o preview do livro.', error: error.message });
        }
    }

    async regeneratePage(req, res) {
        try {
            const { pageId } = req.params;
            const page = await BookPage.findByPk(pageId, { include: { model: Book, as: 'book', include: ['mainCharacter'] }});
            if (!page) {
                return res.status(404).json({ message: 'Página não encontrada.' });
            }
            // Os inputs originais estão salvos no userInputJson da própria página
            await AdminBookGeneratorService.generateSinglePageContent(page, page.book, page.userInputJson);
            const updatedPage = await BookPage.findByPk(pageId);
            res.status(200).json(updatedPage);
        } catch (error) {
            console.error("Erro ao regerar a página:", error);
            res.status(500).json({ message: 'Falha ao regerar a página.', error: error.message });
        }
    }

    async finalizeBook(req, res) {
        try {
            const { bookId } = req.params;
            const book = await AdminBookGeneratorService.finalizeBook(bookId);
            res.status(200).json({ message: 'Livro finalizado com sucesso!', book });
        } catch (error) {
            console.error("Erro ao finalizar o livro:", error);
            res.status(400).json({ message: 'Falha ao finalizar o livro.', error: error.message });
        }
    }
}

// É necessário importar o Book e BookPage aqui para o regeneratePage funcionar
const { Book, BookPage } = require('../../models');

module.exports = new AdminBookGeneratorController();