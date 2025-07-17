const { Router } = require('express');
const authController = require('./Auth.controller');
const { isAuthenticated, isAdmin } = require('./auth.middleware');

const router = Router();

// --- Rotas Públicas ---
router.post('/register', authController.register);
router.post('/login', authController.login);

// --- Rota para criar Admin (protegida) ---
// Apenas um admin logado pode criar outro admin
router.post('/register-admin', authController.registerAdmin);


// --- Rotas de Gerenciamento de Usuários (CRUD para Admin) ---
const adminUserRoutes = Router(); // Sub-roteador para organizar
adminUserRoutes.use(isAuthenticated, isAdmin); // Aplica middlewares a todas as rotas abaixo

adminUserRoutes.get('/', authController.getAllUsers);
adminUserRoutes.get('/:id', authController.getUserById);
adminUserRoutes.put('/:id', authController.updateUser);
adminUserRoutes.delete('/:id', authController.deleteUser);

// Usa o sub-roteador com o prefixo /users
router.use('/users', adminUserRoutes);

// --- NOVO: Rotas de Gerenciamento de Configurações (Admin) ---
const adminSettingsRoutes = Router();
adminSettingsRoutes.use(isAuthenticated, isAdmin);

// GET /api/auth/settings - Pega todas as configurações
adminSettingsRoutes.get('/', authController.getSettings);

// PUT /api/auth/settings/:key - Atualiza uma configuração
adminSettingsRoutes.put('/:key', authController.updateSetting);

router.use('/settings', adminSettingsRoutes);


module.exports = router;