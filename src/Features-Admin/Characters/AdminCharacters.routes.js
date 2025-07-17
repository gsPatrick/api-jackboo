const { Router } = require('express');
const adminCharactersController = require('./AdminCharacters.controller');
const { isAuthenticated, isAdmin } = require('../../Features/Auth/Auth.middleware');
const { uploadAdminAsset } = require('../../Utils/multerConfig'); // <-- ATUALIZADO: Importar uploadAdminAsset

const router = Router();

// Protege todas as rotas do CRUD de personagens
router.use(isAuthenticated, isAdmin);

// GET /api/admin/characters - Lista todos os personagens oficiais
router.get('/', adminCharactersController.list);

// POST /api/admin/characters - Cria um novo personagem oficial
router.post('/', uploadAdminAsset.single('characterImage'), adminCharactersController.create); // <-- ATUALIZADO

// PUT /api/admin/characters/:id - Atualiza um personagem oficial
router.put('/:id', uploadAdminAsset.single('characterImage'), adminCharactersController.update); // <-- ATUALIZADO

// DELETE /api/admin/characters/:id - Deleta um personagem oficial
router.delete('/:id', adminCharactersController.delete);

module.exports = router;