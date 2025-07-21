
const { Router } = require('express');
const contentController = require('./Content.controller');
const { isAuthenticated, isSubscriber } = require('../Auth/Auth.middleware');
// AQUI ESTÁ A IMPORTAÇÃO CRÍTICA
const { uploadUserDrawing } = require('../../Utils/multerConfig');

const router = Router();

// Todas as rotas de conteúdo exigem que o usuário esteja logado
router.use(isAuthenticated);

// --- Rotas de Personagem ---

// ESTA É A LINHA QUE CORRIGE O PROBLEMA.
// Ela garante que, para a rota POST /characters, o middleware `uploadUserDrawing`
// será executado PRIMEIRO. Ele vai procurar por um campo "drawing" no formulário,
// salvar o arquivo e criar o objeto `req.file` para o `contentController` usar.
router.post(
  '/characters',
  // 1. O middleware do Multer é executado. Ele espera um campo 'drawing'.
  // Se for bem-sucedido, ele cria `req.file` e chama o próximo middleware.
  uploadUserDrawing.single('drawing'),
  // 2. O controller é chamado, agora com `req.file` disponível.
  contentController.createCharacter
);

router.get('/characters', contentController.getMyCharacters);
router.delete('/characters/:id', contentController.deleteCharacter);


// --- Rotas de Livro (Simplificadas para o Usuário) ---
// A rota de criação de livro (antiga) foi removida para evitar confusão.
// router.post('/books', isSubscriber, contentController.createBook);

router.get('/books', contentController.getMyBooks);
router.post('/books/create-coloring', isSubscriber, contentController.createColoringBook);
router.post('/books/create-story', isSubscriber, contentController.createStoryBook);


// --- Rotas de Royalties (Painel do Usuário) ---
router.get('/royalties', contentController.getMyRoyalties);
router.post('/royalties/request-payout', contentController.requestPayout);

// --- Rotas de Badges (Painel do Usuário) ---
router.get('/badges', contentController.getMyBadges);

// --- Rotas de Histórico de Pagamentos de Assinatura ---
router.get('/subscription-payments', contentController.getMySubscriptionPayments);

router.post('/books/create-coloring', isSubscriber, contentController.createColoringBook); // Nova rota!

router.put('/characters/:id/name', contentController.updateCharacterName);

module.exports = router;