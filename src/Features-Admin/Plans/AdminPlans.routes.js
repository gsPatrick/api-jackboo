const { Router } = require('express');
const adminPlansController = require('./AdminPlans.controller');
const { isAuthenticated, isAdmin } = require('../../Features/Auth/auth.middleware');

const router = Router();

// Todas as rotas de gerenciamento de planos
router.use(isAuthenticated, isAdmin);

// GET /api/admin/plans - Lista todos os planos
router.get('/', adminPlansController.listAll);

// GET /api/admin/plans/:id - Pega detalhes de um plano específico
router.get('/:id', adminPlansController.getById);

// POST /api/admin/plans - Cria um novo plano
router.post('/', adminPlansController.create);

// PUT /api/admin/plans/:id - Atualiza um plano
router.put('/:id', adminPlansController.update);

// DELETE /api/admin/plans/:id - Deleta um plano
router.delete('/:id', adminPlansController.delete);

module.exports = router;
