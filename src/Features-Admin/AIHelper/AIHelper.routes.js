// src/Features-Admin/AIHelper/AdminAIHelper.routes.js
const { Router } = require('express');
const controller = require('./AIHelper.controller');
const { isAuthenticated, isAdmin } = require('../../Features/Auth/Auth.middleware');

const router = Router();

// Protege a rota para ser acessível apenas por administradores logados
router.use(isAuthenticated, isAdmin);

// Rota principal para o assistente de IA
router.post('/generate-text', controller.generateText);

module.exports = router;