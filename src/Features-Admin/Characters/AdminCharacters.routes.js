// src/Features-Admin/Characters/AdminCharacter.routes.js
const { Router } = require('express');
const controller = require('./AdminCharacters.controller');
const { isAuthenticated, isAdmin } = require('../../Features/Auth/Auth.middleware');
// ✅ CORREÇÃO: Importando o 'uploadUserDrawing' para ser usado na rota de geração
const { uploadAdminAsset, uploadUserDrawing } = require('../../Utils/multerConfig');

const router = Router();
router.use(isAuthenticated, isAdmin);

// GET /api/admin/characters - Lista os personagens do admin
router.get('/', controller.listOfficialCharacters);

// POST /api/admin/characters/upload - Cria um personagem por upload direto (mantém o upload do admin)
router.post(
    '/upload', 
    uploadAdminAsset.single('characterImage'), 
    controller.createOfficialCharacterByUpload
);

// ✅ CORREÇÃO: Usa o middleware 'uploadUserDrawing' para que o arquivo seja salvo
// na mesma pasta que os desenhos dos usuários, pois o serviço reutilizado espera isso.
router.post(
    '/generate', 
    uploadUserDrawing.single('drawing'), // << MUDANÇA AQUI
    controller.createOfficialCharacterWithIA
);

// DELETE /api/admin/characters/:id - Deleta um personagem do admin
router.delete('/:id', controller.deleteOfficialCharacter);

module.exports = router;