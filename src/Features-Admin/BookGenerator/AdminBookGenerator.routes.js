// src/Features-Admin/BookGenerator/AdminBookGenerator.routes.js
const { Router } = require('express');
const controller = require('./AdminBookGenerator.controller');
const { isAuthenticated, isAdmin } = require('../../Features/Auth/Auth.middleware');

const router = Router();
router.use(isAuthenticated, isAdmin);

// POST /api/admin/generator/preview - Inicia a geração e retorna o preview
// Esta rota está correta pois `controller.generatePreview` existe.
router.post('/preview', controller.generatePreview);

// --- ROTAS DESATIVADAS TEMPORARIAMENTE ---
// As funções correspondentes no controller foram comentadas porque dependiam da lógica antiga.
// Precisamos reimplementá-las antes de reativar estas rotas.

// POST /api/admin/generator/pages/:pageId/regenerate - Regera uma única página
// router.post('/pages/:pageId/regenerate', controller.regeneratePage);

// POST /api/admin/generator/books/:bookId/finalize - Finaliza o livro
// router.post('/books/:bookId/finalize', controller.finalizeBook);


module.exports = router;