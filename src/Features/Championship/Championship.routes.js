const { Router } = require('express');
const championshipController = require('./Championship.controller');
const { isAuthenticated } = require('../Auth/Auth.middleware');
const { uploadUserDrawing } = require('../../Utils/multerConfig'); // <-- ATUALIZADO: Importar uploadUserDrawing

const router = Router();

// GET /api/championships/current - Obtém informações do campeonato ativo (pode ser pública)
router.get('/current', championshipController.getCurrentChampionship);

// POST /api/championships/submit - Envia um desenho (requer autenticação e upload)
router.post(
  '/submit',
  isAuthenticated,
  uploadUserDrawing.single('drawing'), // 'drawing' é o nome do campo de arquivo no formulário
  championshipController.submitDrawing
);

// GET /api/championships/:championshipId/submissions - Lista as submissões aprovadas (galeria pública)
router.get('/:championshipId/submissions', championshipController.listPublicSubmissions);

// POST /api/championships/submissions/:submissionId/vote - Votar em um desenho
router.post('/submissions/:submissionId/vote', (req, res, next) => {
    if (req.headers.authorization) {
        isAuthenticated(req, res, next);
    } else {
        next();
    }
}, championshipController.toggleVote);

// GET /api/championships/submissions/:submissionId/vote-status - Contagem de votos e status do usuário
router.get('/submissions/:submissionId/vote-status', (req, res, next) => {
    if (req.headers.authorization) {
        isAuthenticated(req, res, next);
    } else {
        next();
    }
}, championshipController.getSubmissionVoteStatus);


module.exports = router;