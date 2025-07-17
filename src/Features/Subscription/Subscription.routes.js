const { Router } = require('express');
const subscriptionController = require('./Subscription.controller');
const { isAuthenticated } = require('../Auth/Auth.middleware');

const router = Router();

console.log('initiateSubscription:', typeof subscriptionController.initiateSubscription);
console.log('cancelSubscription:', typeof subscriptionController.cancelSubscription);
console.log('getMySubscription:', typeof subscriptionController.getMySubscription);
console.log('getUserSubscriptionPaymentHistory:', typeof subscriptionController.getUserSubscriptionPaymentHistory);


// REMOVIDO: Rota pública para webhook de assinaturas do Mercado Pago (agora em /api/webhooks/mercadopago)
// router.post('/webhook', subscriptionController.handleSubscriptionWebhook);

// Todas as rotas abaixo exigem autenticação
router.use(isAuthenticated);

// POST /api/subscriptions/initiate - Inicia uma nova assinatura
router.post('/initiate', subscriptionController.initiateSubscription);

// POST /api/subscriptions/cancel - Cancela a assinatura do usuário logado
router.post('/cancel', subscriptionController.cancelSubscription);

// GET /api/subscriptions/me - Retorna a assinatura ativa do usuário logado
router.get('/me', subscriptionController.getMySubscription);

// GET /api/subscriptions/payment-history - Retorna o histórico de pagamentos da assinatura do usuário
router.get('/payment-history', subscriptionController.getUserSubscriptionPaymentHistory);


module.exports = router;
