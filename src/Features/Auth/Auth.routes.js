const { Router } = require('express');
const authController = require('./Auth.controller');
const { isAuthenticated, isAdmin } = require('./Auth.middleware');

const router = Router();

// --- Rotas Públicas ---
router.post('/register', authController.register);
router.post('/login', authController.login);

// --- Rota para o próprio perfil do usuário logado ---
// GET /api/auth/profile
router.get('/profile', isAuthenticated, authController.getMe);
// PUT /api/auth/profile (Para atualizar o próprio perfil)
router.put('/profile', isAuthenticated, authController.updateMyProfile);


// --- Rota para criar Admin (protegida) ---
// Apenas um admin logado pode criar outro admin
router.post('/register-admin', isAuthenticated, isAdmin, authController.registerAdmin);


// --- Rotas de Gerenciamento de Usuários (CRUD para Admin) ---
const adminUserRoutes = Router(); // Sub-roteador para organizar
adminUserRoutes.use(isAuthenticated, isAdmin); // Aplica middlewares a todas as rotas abaixo

adminUserRoutes.get('/', authController.getAllUsers);
adminUserRoutes.get('/:id', authController.getUserById);
adminUserRoutes.put('/:id', authController.updateUser);
adminUserRoutes.delete('/:id', authController.deleteUser);

// Usa o sub-roteador com o prefixo /users
router.use('/users', adminUserRoutes);

// --- Rotas de Gerenciamento de Configurações (Admin) ---
const adminSettingsRoutes = Router();
adminSettingsRoutes.use(isAuthenticated, isAdmin);

// GET /api/auth/settings - Pega todas as configurações
adminSettingsRoutes.get('/', authController.getSettings);

// PUT /api/auth/settings/:key - Atualiza uma configuração
adminSettingsRoutes.put('/:key', authController.updateSetting);

router.use('/settings', adminSettingsRoutes);


module.exports = router;