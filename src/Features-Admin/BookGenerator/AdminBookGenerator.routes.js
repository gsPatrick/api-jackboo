// src/Features-Admin/BookGenerator/AdminBookGenerator.routes.js
const { Router } = require('express');
const controller = require('./AdminBookGenerator.controller');
const { isAuthenticated, isAdmin } = require('../../Features/Auth/auth.middleware');

const router = Router();
router.use(isAuthenticated, isAdmin);

// POST /api/admin/generator/preview - Inicia a geração e retorna o preview
router.post('/preview', controller.generatePreview);

// POST /api/admin/generator/pages/:pageId/regenerate - Regera uma única página
router.post('/pages/:pageId/regenerate', controller.regeneratePage);

// POST /api/admin/generator/books/:bookId/finalize - Finaliza o livro
router.post('/books/:bookId/finalize', controller.finalizeBook);

module.exports = router;