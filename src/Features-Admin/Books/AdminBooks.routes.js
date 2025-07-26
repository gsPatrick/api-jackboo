// src/Features-Admin/Books/AdminBooks.routes.js
const { Router } = require('express');
const controller = require('./AdminBooks.controller');
const { isAuthenticated, isAdmin } = require('../../Features/Auth/Auth.middleware');

const router = Router();
router.use(isAuthenticated, isAdmin);

// GET /api/admin/books -> Lista todos os livros oficiais
router.get('/', controller.listAllBooks); // Usando a rota que lista todos os livros

// GET /api/admin/books/:id -> Pega detalhes de um livro específico
router.get('/:id', controller.getOfficialBookById);

// ✅ NOVA ROTA: Atualiza o status de um livro (privado/publicado)
router.put('/:id/status', controller.updateOfficialBookStatus);

// DELETE /api/admin/books/:id -> Deleta um livro oficial
router.delete('/:id', controller.deleteOfficialBook);

module.exports = router;