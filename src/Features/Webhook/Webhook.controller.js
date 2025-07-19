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

      async handleLeonardoCallback(req, res) {
    try {
      // Aqui você pode adicionar uma verificação de segurança,
      // comparando a chave da API do webhook enviada no header
      // com uma que você salvou nas suas variáveis de ambiente.
      const leonardoApiKey = req.headers['x-leonardo-api-key']; // Exemplo de header
      // if (leonardoApiKey !== process.env.LEONARDO_WEBHOOK_API_KEY) {
      //   return res.status(401).send('Unauthorized');
      // }
      
      console.log('[WebhookController] Notificação do Leonardo recebida!');
      // Delega o processamento para um serviço
      await webhookService.processLeonardoResult(req.body);

      // Responde imediatamente ao Leonardo para dizer que recebeu.
      // Não espere o processamento terminar.
      res.status(200).send('OK');
    } catch (error) {
      console.error('[WebhookController] Erro ao processar webhook:', error.message);
      // Mesmo com erro, é bom responder 200 para o webhook não tentar de novo.
      res.status(200).send('Error processing, but received.');
    }
  }

}

module.exports = new WebhookController();