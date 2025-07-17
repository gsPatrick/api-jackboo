const { Router } = require('express');
const contentController = require('./Content.controller');
const { isAuthenticated, isSubscriber } = require('../Auth/auth.middleware');
const { uploadUserDrawing } = require('../../Utils/multerConfig'); // <-- ATUALIZADO: Importar uploadUserDrawing

const router = Router();

// Todas as rotas de conteúdo exigem que o usuário esteja logado
router.use(isAuthenticated);

// --- Rotas de Personagem ---
router.post(
  '/characters', 
  uploadUserDrawing.single('drawing'), // <-- ATUALIZADO
  contentController.createCharacter
);
router.get('/characters', contentController.getMyCharacters);
router.delete('/characters/:id', contentController.deleteCharacter);


// --- Rotas de Livro ---
router.post('/books', isSubscriber, contentController.createBook);
router.get('/books', contentController.getMyBooks);

// --- Rotas de Royalties (Painel do Usuário) ---
router.get('/royalties', contentController.getMyRoyalties);
router.post('/royalties/request-payout', contentController.requestPayout);

// --- Rotas de Badges (Painel do Usuário) ---
router.get('/badges', contentController.getMyBadges);

// --- Rotas de Histórico de Pagamentos de Assinatura ---
router.get('/subscription-payments', contentController.getMySubscriptionPayments);

// --- Rotas de Livro (Simplificadas para o Usuário) ---
// Usuário só precisa ser assinante para acessar estas rotas
router.use('/books', isSubscriber);
router.post('/books/create-coloring', contentController.createColoringBook);
router.post('/books/create-story', contentController.createStoryBook);
router.get('/books', contentController.getMyBooks); // Lista todos os livros do usuário


module.exports = router;