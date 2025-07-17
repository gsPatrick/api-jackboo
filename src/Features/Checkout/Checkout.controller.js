const checkoutService = require('./Checkout.service');
// O shippingService não é mais chamado diretamente aqui, mas sim através do checkoutService
// const shippingService = require('../../Utils/Payment/shipping.service'); // REMOVER OU MANTER PARA FUTURO USO DIRETO

class CheckoutController {
    async calculateShipping(req, res, next) {
        try {
            const { originZipCode, destinationZipCode, items } = req.body;
            // Agora, o controlador chama o serviço de checkout, que encapsula a lógica do frete.
            const options = await checkoutService.calculateShippingOptions(originZipCode, destinationZipCode, items);
            res.status(200).json(options);
        } catch (error) {
            // Em caso de erro no cálculo, o erro pode ser mais específico
            res.status(400).json({ message: error.message || 'Erro ao calcular o frete.' });
        }
    }

    async createOrder(req, res, next) {
        try {
            const { items, address, shippingOption } = req.body;
            const order = await checkoutService.createOrder(req.user.id, items, address, shippingOption);
            res.status(201).json(order);
        } catch (error) {
            res.status(400).json({ message: error.message || 'Erro ao criar o pedido.' });
        }
    }
    
    async createPayment(req, res, next) {
        try {
            const { orderId } = req.body;
            const checkoutUrl = await checkoutService.initiatePayment(orderId, req.user.id);
            res.status(200).json({ checkoutUrl });
        } catch (error) {
            res.status(400).json({ message: error.message || 'Erro ao iniciar o pagamento.' });
        }
    }

    async paymentWebhook(req, res, next) {
        try {
            // O Mercado Pago espera uma resposta 200 OK para considerar o webhook recebido
            await checkoutService.handlePaymentWebhook(req.body);
            res.status(200).send('Webhook received');
        } catch (error) {
            // É crucial não retornar um status de erro para o gateway, apenas logar
            console.error("Erro ao processar webhook do Mercado Pago:", error);
            res.status(200).send('Webhook received, but internal processing error occurred.');
        }
    }

    async getMyOrders(req, res, next) {
        try {
            const orders = await checkoutService.getUserOrders(req.user.id);
            res.status(200).json(orders);
        } catch (error) {
            res.status(500).json({ message: error.message || 'Erro ao buscar seus pedidos.' });
        }
    }

    async getMyDownloads(req, res, next) {
        try {
            const downloads = await checkoutService.getUserDigitalProducts(req.user.id);
            res.status(200).json(downloads);
        } catch (error) {
            res.status(500).json({ message: error.message || 'Erro ao buscar seus produtos digitais.' });
        }
    }
}
module.exports = new CheckoutController();
