// src/Features-Admin/Royalties/AdminRoyalties.routes.js
const { Router } = require('express');
const adminRoyaltiesController = require('./AdminRoyalties.controller');
const { isAuthenticated, isAdmin } = require('../../Features/Auth/Auth.middleware');

const router = Router();

// Protege todas as rotas de gerenciamento de royalties do admin
router.use(isAuthenticated, isAdmin);

// GET /api/admin/royalties - Lista todos os royalties, com filtros (ex: /?status=pending)
router.get('/', adminRoyaltiesController.listRoyalties);

// POST /api/admin/royalties/mark-as-paid - Marca um ou mais royalties como pagos
// O corpo da requisição deve ser: { "royaltyIds": [1, 2, 3] }
router.post('/mark-as-paid', adminRoyaltiesController.markAsPaid);

// GET /api/admin/royalties/pending-total/:authorId - Pega o total pendente para um autor específico
router.get('/pending-total/:authorId', adminRoyaltiesController.getPendingTotal);

module.exports = router;