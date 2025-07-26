// src/Features-Admin/Taxonomies/AdminTaxonomies.routes.js
const { Router } = require('express');
const controller = require('./AdminTaxonomies.controller');
const { isAuthenticated, isAdmin } = require('../../Features/Auth/Auth.middleware');

const router = Router();
router.use(isAuthenticated, isAdmin);

// Rotas para Categorias
router.get('/categories', controller.listCategories);
router.post('/categories', controller.createCategory);
router.put('/categories/:id', controller.updateCategory);
router.delete('/categories/:id', controller.deleteCategory);

// Rotas para Classificação Etária
router.get('/age-ratings', controller.listAgeRatings);
router.post('/age-ratings', controller.createAgeRating);
router.put('/age-ratings/:id', controller.updateAgeRating);
router.delete('/age-ratings/:id', controller.deleteAgeRating);

// --- NOVO: Rotas para Formatos de Impressão ---
router.get('/print-formats', controller.listPrintFormats);
router.post('/print-formats', controller.createPrintFormat);
router.put('/print-formats/:id', controller.updatePrintFormat);
router.delete('/print-formats/:id', controller.deletePrintFormat);

// ROTA REMOVIDA: A rota para '/ai-settings' foi removida.
// O frontend deve agora usar a rota GET /api/admin/leonardo/elements para listar os estilos.

module.exports = router;