const { Router } = require('express');
const popularityController = require('./Popularity.controller');
const { isAuthenticated } = require('../Auth/auth.middleware');

const router = Router();

// Endpoint para dar/remover like (requer autenticação)
// POST /api/popularity/:likableType/:likableId/toggle-like
// Ex: /api/popularity/Book/123/toggle-like
// Ex: /api/popularity/Character/456/toggle-like
router.post('/:likableType/:likableId/toggle-like', isAuthenticated, popularityController.toggleLike);

// Endpoint para pegar a contagem de likes (pode ser pública)
// GET /api/popularity/:likableType/:likableId/count
// Inclui se o usuário logado já curtiu (se token for enviado)
router.get('/:likableType/:likableId/count', popularityController.getLikesCount);

module.exports = router;