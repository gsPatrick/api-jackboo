const { Router } = require('express');
const adminChampionshipsController = require('./AdminChampionships.controller');
const { isAuthenticated, isAdmin } = require('../../Features/Auth/auth.middleware');

const router = Router();

// Todas as rotas de administração de campeonatos requerem autenticação e privilégios de admin
router.use(isAuthenticated, isAdmin);

// --- Rotas de Gerenciamento de Campeonatos (CRUD) ---
// GET /api/admin/championships - Lista todos os campeonatos
router.get('/', adminChampionshipsController.listAll);
// GET /api/admin/championships/:id - Detalhes de um campeonato
router.get('/:id', adminChampionshipsController.getById);
// POST /api/admin/championships - Cria um novo campeonato
router.post('/', adminChampionshipsController.create);
// PUT /api/admin/championships/:id - Atualiza um campeonato
router.put('/:id', adminChampionshipsController.update);
// DELETE /api/admin/championships/:id - Deleta um campeonato
router.delete('/:id', adminChampionshipsController.delete);

// --- Rotas de Moderação de Submissões ---
// GET /api/admin/championships/submissions - Lista submissões para moderação
router.get('/submissions', adminChampionshipsController.listSubmissionsForModeration);
// PUT /api/admin/championships/submissions/:id/approve - Aprova uma submissão
router.put('/submissions/:id/approve', adminChampionshipsController.approveSubmission);
// PUT /api/admin/championships/submissions/:id/reject - Rejeita uma submissão
router.put('/submissions/:id/reject', adminChampionshipsController.rejectSubmission);

// --- Rotas para Triggers de Cálculo/Status (podem ser chamadas por CRON ou manualmente) ---
// POST /api/admin/championships/:championshipId/calculate-prizes - Calcula prêmios
router.post('/:championshipId/calculate-prizes', adminChampionshipsController.calculateAvailablePrizes);
// POST /api/admin/championships/:championshipId/calculate-scores - Calcula pontuações finais
router.post('/:championshipId/calculate-scores', adminChampionshipsController.calculateFinalScores);
// POST /api/admin/championships/:championshipId/determine-winners - Determina vencedores
router.post('/:championshipId/determine-winners', adminChampionshipsController.determineWinners);


module.exports = router;
