// src/Features-Admin/Books/AdminBooks.controller.js
const adminBooksService = require('./AdminBooks.service');

class AdminBooksController {
    async listOfficialBooks(req, res, next) {
        try {
            const result = await adminBooksService.listOfficialBooks(req.query);
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

    async deleteOfficialBook(req, res, next) {
        try {
            const { id } = req.params;
            await adminBooksService.deleteOfficialBook(id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

 async listAllBooks(req, res, next) {
        try {
            const result = await AdminBooksService.listAllBooks();
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    async deleteOfficialBook(req, res, next) {
        try {
            const { id } = req.params;
            const result = await AdminBooksService.deleteOfficialBook(id);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

}

module.exports = new AdminBooksController();