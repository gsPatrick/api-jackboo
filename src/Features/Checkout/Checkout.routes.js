const { Router } = require('express');
const checkoutController = require('./Checkout.controller');
const { isAuthenticated } = require('../Auth/auth.middleware');

const router = Router();

// Rota pública para calcular o frete no carrinho
router.post('/shipping', checkoutController.calculateShipping);

// REMOVIDO: Rota pública para o webhook do Mercado Pago (agora em /api/webhooks/mercadopago)
// router.post('/webhook', checkoutController.paymentWebhook);


// Rotas abaixo exigem autenticação
router.use(isAuthenticated);

// Cria um pedido (antes de ir para o pagamento)
router.post('/orders', checkoutController.createOrder);
// Inicia o processo de pagamento para um pedido existente
router.post('/payment', checkoutController.createPayment);
// Lista os pedidos do usuário logado
router.get('/orders', checkoutController.getMyOrders);
// Lista os produtos digitais comprados pelo usuário
router.get('/downloads', checkoutController.getMyDownloads);

module.exports = router;
