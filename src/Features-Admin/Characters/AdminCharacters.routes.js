// src/Features-Admin/Characters/AdminCharacters.routes.js

const { Router } = require('express');
const adminCharactersController = require('./AdminCharacters.controller');
const { isAuthenticated, isAdmin } = require('../../Features/Auth/Auth.middleware');
const { uploadAdminAsset } = require('../../Utils/multerConfig'); // Middleware para upload

const router = Router();

// Protege todas as rotas de gerenciamento de personagens oficiais
router.use(isAuthenticated, isAdmin);

// GET /api/admin/characters - Lista todos os personagens oficiais
router.get('/', adminCharactersController.list);

// POST /api/admin/characters - Cria um novo personagem oficial
// O middleware 'uploadAdminAsset' processa o arquivo do campo 'characterImage'
router.post('/', uploadAdminAsset.single('characterImage'), adminCharactersController.create);

// PUT /api/admin/characters/:id - Atualiza um personagem oficial
router.put('/:id', uploadAdminAsset.single('characterImage'), adminCharactersController.update);

// DELETE /api/admin/characters/:id - Deleta um personagem oficial
router.delete('/:id', adminCharactersController.delete);

module.exports = router;