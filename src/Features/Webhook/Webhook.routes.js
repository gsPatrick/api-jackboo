// src/Features/Webhook/Webhook.routes.js
const { Router } = require('express');
const webhookController = require('./Webhook.controller');

const router = Router();

// Rota pública que recebe as notificações (POST) do Mercado Pago
// POST /api/webhooks/mercadopago
router.post('/mercadopago', webhookController.handleMercadoPagoWebhook);

module.exports = router;