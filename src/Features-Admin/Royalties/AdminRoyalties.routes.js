const { Router } = require('express');
const addressController = require('../../Features/Address/Address.controller');
const { isAuthenticated } = require('../../Features/Auth/Auth.middleware');

const router = Router();

// Todas as rotas de endereço exigem autenticação
router.use(isAuthenticated);

// POST /api/addresses - Cria um novo endereço
router.post('/', addressController.createAddress);

// GET /api/addresses - Lista todos os endereços do usuário logado
router.get('/', addressController.getMyAddresses);

// PUT /api/addresses/:id - Atualiza um endereço específico
router.put('/:id', addressController.updateAddress);

// DELETE /api/addresses/:id - Deleta um endereço específico
router.delete('/:id', addressController.deleteAddress);

// POST /api/addresses/:id/set-primary - Define um endereço como primário
router.post('/:id/set-primary', addressController.setPrimaryAddress);

module.exports = router;
