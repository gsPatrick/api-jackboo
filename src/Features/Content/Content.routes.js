// src/Features/Content/Content.routes.js

const { Router } = require('express');
const contentController = require('./Content.controller');
// O middleware 'isSubscriber' não será mais usado para criação de livros, mas a importação pode permanecer
const { isAuthenticated, isSubscriber } = require('../Auth/Auth.middleware');
const { uploadUserDrawing } = require('../../Utils/multerConfig');

const router = Router();

// Todas as rotas de conteúdo exigem que o usuário esteja logado
router.use(isAuthenticated);

// --- Rotas de Personagem ---
router.post(
  '/characters',
  uploadUserDrawing.single('drawing'),
  contentController.createCharacter
);

router.get('/characters', contentController.getMyCharacters);
router.delete('/characters/:id', contentController.deleteCharacter);
router.put('/characters/:id/name', contentController.updateCharacterName);


// --- Rotas de Livro (Simplificadas para o Usuário) ---
router.get('/books', contentController.getMyBooks);

// ROTA CORRIGIDA: Middleware 'isSubscriber' foi removido
router.post('/books/create-coloring', contentController.createColoringBook);

// ROTA CORRIGIDA: Middleware 'isSubscriber' foi removido
router.post('/books/create-story', contentController.createStoryBook);


// --- Rotas de Royalties (Painel do Usuário) ---
router.get('/royalties', contentController.getMyRoyalties);
router.post('/royalties/request-payout', contentController.requestPayout);

// --- Rotas de Badges (Painel do Usuário) ---
router.get('/badges', contentController.getMyBadges);

// --- Rotas de Histórico de Pagamentos de Assinatura ---
router.get('/subscription-payments', contentController.getMySubscriptionPayments);

// NOTA: A rota duplicada no final do arquivo original também foi corrigida/removida para consistência.

module.exports = router;