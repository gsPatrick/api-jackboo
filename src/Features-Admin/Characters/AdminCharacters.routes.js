// src/Features-Admin/Characters/AdminCharacter.routes.js
const { Router } = require('express');
const controller = require('./AdminCharacters.controller');
const { isAuthenticated, isAdmin } = require('../../Features/Auth/Auth.middleware');
// ✅ CORREÇÃO: Garantindo que ambos os middlewares de upload estejam disponíveis.
const { uploadAdminAsset, uploadUserDrawing } = require('../../Utils/multerConfig');

const router = Router();
router.use(isAuthenticated, isAdmin);

// GET /api/admin/characters - Lista os personagens do admin
router.get('/', controller.listOfficialCharacters);

// ✅ CORREÇÃO: Rota para upload direto, usando o middleware 'uploadAdminAsset'
// e esperando o campo 'characterImage' do formulário.
router.post(
    '/upload', 
    uploadAdminAsset.single('characterImage'), 
    controller.createOfficialCharacterByUpload
);

// Rota para geração por IA, que usa um middleware diferente.
router.post(
    '/generate', 
    uploadUserDrawing.single('drawing'), 
    controller.createOfficialCharacterWithIA
);

// DELETE /api/admin/characters/:id - Deleta um personagem do admin
router.delete('/:id', controller.deleteOfficialCharacter);

module.exports = router;