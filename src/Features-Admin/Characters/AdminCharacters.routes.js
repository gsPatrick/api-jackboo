// src/Features-Admin/Characters/AdminCharacter.routes.js
const { Router } = require('express');
const controller = require('./AdminCharacters.controller');
const { isAuthenticated, isAdmin } = require('../../Features/Auth/Auth.middleware');
const { uploadAdminAsset } = require('../../Utils/multerConfig');

const router = Router();
router.use(isAuthenticated, isAdmin);

// GET /api/admin/characters - Lista os personagens do admin
router.get('/', controller.listOfficialCharacters);

// POST /api/admin/characters/upload - Cria um personagem por upload direto
router.post(
    '/upload', 
    uploadAdminAsset.single('characterImage'), 
    controller.createOfficialCharacterByUpload
);

// POST /api/admin/characters/generate - Cria um personagem usando o fluxo de IA do ContentService
router.post(
    '/generate', 
    uploadAdminAsset.single('drawing'), 
    controller.createOfficialCharacterWithIA
);

// DELETE /api/admin/characters/:id - Deleta um personagem do admin
router.delete('/:id', controller.deleteOfficialCharacter);

module.exports = router;