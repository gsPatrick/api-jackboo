// src/Features/Webhook/Webhook.controller.js
const checkoutService = require('../Checkout/Checkout.service');
const subscriptionService = require('../Subscription/Subscription.service');

class WebhookController {
    /**
     * Ponto de entrada único para todos os webhooks do Mercado Pago.
     * Ele inspeciona o payload para determinar se é uma notificação de pagamento ou de assinatura.
     */
    async handleMercadoPagoWebhook(req, res) {
        const data = req.body;
        console.log('Webhook do Mercado Pago recebido:', data);

        try {
            // Notificações de pagamento de compra única (type: 'payment')
            if (data.type === 'payment') {
                await checkoutService.handlePaymentWebhook(data);
                console.log('Webhook de pagamento processado.');
            }
            // Notificações de assinatura (topic: 'preapproval')
            else if (data.topic === 'preapproval') {
                await subscriptionService.handlePreapprovalWebhook(data);
                console.log('Webhook de pré-aprovação (assinatura) processado.');
            } 
            else {
                console.warn('Tipo de webhook não reconhecido:', data.type || data.topic);
            }

            // O Mercado Pago espera uma resposta 200 OK para confirmar o recebimento.
            res.status(200).send('Webhook recebido com sucesso.');

        } catch (error) {
            console.error("Erro CRÍTICO ao processar webhook do Mercado Pago:", error);
            // Mesmo com erro interno, responda 200 para o MP não continuar reenviando a notificação.
            // O erro já foi logado e deve ser investigado.
            res.status(200).send('Webhook recebido, erro interno no processamento.');
        }
    }
}

module.exports = new WebhookController();