// src/Features-Admin/BookTemplates/AdminBookTemplates.routes.js
const { Router } = require('express');
const controller = require('./AdminBooks.controller');
const { isAuthenticated, isAdmin } = require('../../Features/Auth/Auth.middleware');

const router = Router();

// Protege todas as rotas de gerenciamento de templates
router.use(isAuthenticated, isAdmin);

// --- Rotas para BookTemplates ---
router.get('/', controller.listBookTemplates);
router.post('/', controller.createBookTemplate);
router.get('/:id', controller.getBookTemplateById);
router.put('/:id', controller.updateBookTemplate);
router.delete('/:id', controller.deleteBookTemplate);

// --- Rotas para PageTemplates (aninhadas sob um bookTemplate) ---
// Cria um template de página para um bookTemplate específico
// POST /api/admin/book-templates/:bookTemplateId/pages
router.post('/:bookTemplateId/pages', controller.createPageTemplate);

// Atualiza um template de página existente
// PUT /api/admin/book-templates/pages/:pageId
router.put('/pages/:pageId', controller.updatePageTemplate);

// Deleta um template de página
// DELETE /api/admin/book-templates/pages/:pageId
router.delete('/pages/:pageId', controller.deletePageTemplate);


module.exports = router;    