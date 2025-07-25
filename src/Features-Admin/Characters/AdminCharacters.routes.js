// src/Features-Admin/Characters/AdminCharacter.routes.js
const { Router } = require('express');
const controller = require('./AdminCharacters.controller');
const { isAuthenticated, isAdmin } = require('../../Features/Auth/Auth.middleware');
const { uploadAdminAsset } = require('../../Utils/multerConfig');

const router = Router();
router.use(isAuthenticated, isAdmin);

router.get('/', controller.listOfficialCharacters);
router.delete('/:id', controller.deleteOfficialCharacter);

/**
 * Rota para criar personagem via UPLOAD DIRETO de imagem final.
 * Campo do FormData: 'characterImage'
 */
router.post(
    '/upload', 
    uploadAdminAsset.single('characterImage'), 
    controller.createOfficialCharacterByUpload
);

/**
 * Rota para GERAÇÃO COMPLETA via IA a partir de um desenho.
 * Campo do FormData: 'drawing'
 */
router.post(
    '/',
    uploadAdminAsset.single('drawing'),
    controller.createOfficialCharacter
);

module.exports = router;