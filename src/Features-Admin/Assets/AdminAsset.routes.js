const { Router } = require('express');
const adminAssetController = require('./AdminAsset.controller');
const { isAuthenticated, isAdmin } = require('../../Features/Auth/Auth.middleware');
const { uploadAdminAsset } = require('../../Utils/multerConfig'); // Para upload de assets do admin

const router = Router();

// Protege todas as rotas de gerenciamento de assets
router.use(isAuthenticated, isAdmin);

// GET /api/admin/assets - Lista todos os assets
router.get('/', adminAssetController.listAssets);

// GET /api/admin/assets/:id - Pega detalhes de um asset específico

// POST /api/admin/assets - Cria um novo asset (com upload de arquivo)
router.post('/', uploadAdminAsset.single('assetFile'), adminAssetController.createAsset);

// PUT /api/admin/assets/:id - Atualiza os metadados de um asset (NÃO o arquivo)
router.put('/:id', adminAssetController.updateAsset);

// DELETE /api/admin/assets/:id - Deleta um asset e seu arquivo físico
router.delete('/:id', adminAssetController.deleteAsset);

// 🔴 REMOVIDO: router.use('/dmin/assets', adminAssetRoutes); — Isso causava erro

module.exports = router;
