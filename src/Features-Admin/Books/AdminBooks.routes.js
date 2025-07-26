// src/Features-Admin/Books/AdminBooks.routes.js
const { Router } = require('express');
const controller = require('./AdminBooks.controller');
const { isAuthenticated, isAdmin } = require('../../Features/Auth/Auth.middleware');

const router = Router();
router.use(isAuthenticated, isAdmin);

// GET /api/admin/books -> Lista todos os livros oficiais
router.get('/', controller.listOfficialBooks);

// GET /api/admin/books/:id -> Pega detalhes de um livro específico (útil para o preview e edição)
router.get('/:id', controller.getOfficialBookById);

// DELETE /api/admin/books/:id -> Deleta um livro oficial
router.delete('/:id', controller.deleteOfficialBook);



// GET /api/admin/books - Lista todos os livros do admin
router.get('/', controller.listAllBooks);

// DELETE /api/admin/books/:id - Deleta um livro específico
router.delete('/:id', controller.deleteOfficialBook);

router.get('/:id', controller.getOfficialBookById); // <-- NOVA ROTA


module.exports = router;