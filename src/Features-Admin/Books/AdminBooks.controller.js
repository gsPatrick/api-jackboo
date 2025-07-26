// src/Features-Admin/Books/AdminBooks.controller.js
const adminBooksService = require('./AdminBooks.service');

class AdminBooksController {
    // ... outros métodos ...
    async listAllBooks(req, res, next) {
        try {
            const result = await adminBooksService.listAllBooks();
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    async getOfficialBookById(req, res, next) {
        try {
            const { id } = req.params;
            const book = await adminBooksService.findOfficialBookById(id);
            res.status(200).json(book);
        } catch (error) {
            next(error);
        }
    }
    
    /**
     * ✅ NOVO MÉTODO: Controla a atualização de status do livro.
     */
    async updateOfficialBookStatus(req, res, next) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const updatedBook = await adminBooksService.updateOfficialBookStatus(id, status);
            res.status(200).json(updatedBook);
        } catch (error) {
            next(error);
        }
    }

    async deleteOfficialBook(req, res, next) {
        try {
            const { id } = req.params;
            const result = await adminBooksService.deleteOfficialBook(id);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

     async listUserBooks(req, res, next) {
        try {
            const result = await adminBooksService.listUserBooks(req.query);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AdminBooksController();