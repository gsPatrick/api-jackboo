// src/Features-Admin/Users/AdminUsers.routes.js
const { Router } = require('express');
const controller = require('./AdminUsers.controller');
const { isAuthenticated, isAdmin } = require('../../Features/Auth/Auth.middleware');

const router = Router();

// Protege todas as rotas de usuários
router.use(isAuthenticated, isAdmin);

// GET /api/admin/users - Lista todos os usuários
router.get('/', controller.listUsers);

module.exports = router;