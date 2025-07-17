const { Router } = require('express');
const adminOpenAISettingController = require('./AdminOpenAISetting.controller');
const { isAuthenticated, isAdmin } = require('../../../Features/Auth/auth.middleware');

const router = Router();

// Protege todas as rotas de gerenciamento de configurações OpenAI
router.use(isAuthenticated, isAdmin);

// --- Rotas de Configurações OpenAI ---
router.get('/', adminOpenAISettingController.listSettings);
router.get('/:type', adminOpenAISettingController.getSettingByType);
router.post('/:type', adminOpenAISettingController.createOrUpdateSetting);
router.put('/:type', adminOpenAISettingController.createOrUpdateSetting);

// DELETE /api/admin/openai-settings/:type - Deleta uma configuração
router.delete('/:type', adminOpenAISettingController.deleteSetting);

// --- Rotas de Histórico de Geração ---
router.get('/logs', adminOpenAISettingController.listGeneratedImageLogs);

module.exports = router;