// src/Features-Admin/Taxonomies/AdminTaxonomies.routes.js
const { Router } = require('express');
const controller = require('./AdminTaxonomies.controller');
const { isAuthenticated, isAdmin } = require('../../Features/Auth/auth.middleware');

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

// --- NOVO: Rotas para IA Settings (Usadas pelos Templates) ---
// GET /api/admin/taxonomies/ai-settings
router.get('/ai-settings', controller.listAiSettings); // Precisa implementar no controller/service
// GET /api/admin/taxonomies/ai-settings/:id
router.get('/ai-settings/:id', controller.getAiSettingById); // Precisa implementar
// POST /api/admin/taxonomies/ai-settings
router.post('/ai-settings', controller.createAiSetting); // Precisa implementar
// PUT /api/admin/taxonomies/ai-settings/:id
router.put('/ai-settings/:id', controller.updateAiSetting); // Precisa implementar
// DELETE /api/admin/taxonomies/ai-settings/:id
router.delete('/ai-settings/:id', controller.deleteAiSetting); // Precisa implementar

router.get('/ai-settings', controller.listAllAiSettings);

// --- NOVO: Rotas para Formatos de Impressão ---
router.get('/print-formats', controller.listPrintFormats);
router.post('/print-formats', controller.createPrintFormat);
router.put('/print-formats/:id', controller.updatePrintFormat);
router.delete('/print-formats/:id', controller.deletePrintFormat);

module.exports = router;