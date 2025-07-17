const mercadopago = require('../../../config/mercadoPago');
const { Order, User, Book, BookVariation, Plan, Subscription } = require('../../../models');
const { v4: uuidv4 } = require('uuid'); // Para gerar IDs únicos se necessário

class MercadoPagoService {
    /**
     * Cria uma preferência de pagamento para um pedido único (já existente).
     * @param {number} orderId - ID do pedido no seu sistema.
     * @param {number} userId - ID do usuário.
     * @returns {object} Objeto com URL de checkout e preferenceId.
     */
    async createPreference(orderId, userId) {
        const order = await Order.findOne({
            where: { id: orderId, userId },
            include: [{ model: User, as: 'user' }, { model: BookVariation, as: 'items', include: ['book'] }]
        });
        if (!order) throw new Error("Pedido não encontrado.");

        const items = await Promise.all(order.items.map(async (item) => {
            const variation = await BookVariation.findByPk(item.bookVariationId, { include: ['book'] }); // Recarregar para garantir o include do book
            if (!variation) { // Adicionado verificação para evitar erro de null
                console.warn(`Variação de livro ID ${item.bookVariationId} não encontrada para o item do pedido.`);
                return null;
            }
            return {
                id: variation.id.toString(),
                title: `${variation.book.title} (${variation.format === 'physical' ? 'Físico' : 'Digital'})`,
                unit_price: parseFloat(item.unitPrice),
                quantity: item.quantity,
                category_id: "books_and_magazines",
                picture_url: variation.coverUrl || undefined,
            };
        }).filter(Boolean)); // Filtra itens nulos

        // Se houver custo de frete, adicione-o como um item separado
        if (parseFloat(order.shippingCost) > 0) {
            items.push({
                id: "shipping",
                title: "Frete",
                unit_price: parseFloat(order.shippingCost),
                quantity: 1,
                category_id: "shipping",
            });
        }
        
        const preference = {
            items,
            payer: { name: order.user.fullName, email: order.user.email },
            back_urls: {
                success: `${process.env.FRONTEND_URL}/payment/success?orderId=${orderId}`,
                failure: `${process.env.FRONTEND_URL}/payment/error?orderId=${orderId}`,
                pending: `${process.env.FRONTEND_URL}/payment/pending?orderId=${orderId}`,
            },
            auto_return: "approved",
            external_reference: orderId.toString(),
            // URL para onde o MP envia notificações (IPN) para pagamentos (ordens)
            notification_url: `${process.env.API_URL}/api/checkout/webhook`,
        };
        
        const response = await mercadopago.preferences.create(preference);
        return {
            checkoutUrl: response.body.init_point,
            preferenceId: response.body.id,
        };
    }

    /**
     * Processa webhooks de pagamento (para ordens únicas).
     * @param {object} data - Dados do webhook.
     * @returns {object|null} Detalhes do pagamento ou null.
     */
    async processPaymentWebhook(data) {
        if (data.type === "payment" && data.data && data.data.id) {
            const payment = await mercadopago.payment.findById(data.data.id);
            // Verifica se a notificação é de um pagamento finalizado (approved, rejected, cancelled)
            if (payment.body && payment.body.status) {
                const orderId = payment.body.external_reference;
                const status = payment.body.status;
                return { orderId, status, paymentDetails: payment.body, type: 'payment' };
            }
        }
        return null;
    }

    /**
     * Cria uma pré-aprovação para uma assinatura recorrente.
     * https://www.mercadopago.com.br/developers/pt/reference/subscriptions/resource/preapproval-plans/resource
     * @param {number} planId - ID do plano no seu sistema.
     * @param {number} userId - ID do usuário.
     * @returns {object} Objeto com URL de checkout e preapprovalId.
     */
    async createPreapproval(planId, userId) {
        const plan = await Plan.findByPk(planId);
        const user = await User.findByPk(userId);

        if (!plan) throw new Error('Plano de assinatura não encontrado.');
        if (!user) throw new Error('Usuário não encontrado.');

        // Mapeia a frequência do seu sistema para o Mercado Pago
        let frequencyUnit;
        if (plan.frequency === 'monthly') frequencyUnit = 'months';
        else if (plan.frequency === 'yearly') frequencyUnit = 'years';
        else throw new Error('Frequência de plano não suportada pelo Mercado Pago.');

        const preapprovalData = {
            preapproval_plan_id: plan.gatewayPlanId, // ID do plano criado no Mercado Pago (se você pré-registrou planos lá)
            reason: `Assinatura JackBoo: ${plan.name}`,
            payer_email: user.email,
            back_url: `${process.env.FRONTEND_URL}/subscription/success?userId=${userId}&planId=${planId}`,
            status: 'pending', // Inicia como pending
            external_reference: `${user.id}-${plan.id}-${uuidv4()}`, // Identificador único da sua assinatura
            // Se você não usa preapproval_plan_id, pode definir o esquema de recorrência aqui:
            // auto_recurring: {
            //     frequency: 1, // A cada 1 mês/ano
            //     frequency_type: frequencyUnit,
            //     transaction_amount: parseFloat(plan.price),
            //     currency_id: "BRL",
            // },
            // notification_url: `${process.env.API_URL}/api/subscriptions/webhook`, // Webhook para assinaturas
        };

        // Se o plano não tiver um gatewayPlanId (se você não pré-registrou planos no MP),
        // use o esquema de recorrência direto no preapproval.
        if (!plan.gatewayPlanId) {
             preapprovalData.auto_recurring = {
                frequency: 1,
                frequency_type: frequencyUnit,
                transaction_amount: parseFloat(plan.price),
                currency_id: "BRL",
            };
            preapprovalData.notification_url = `${process.env.API_URL}/api/subscriptions/webhook`; // Webhook para assinaturas
        } else {
             // Quando se usa preapproval_plan_id, o notification_url e back_url são do plano,
             // mas você pode sobrescrever aqui se precisar de callbacks específicos.
             preapprovalData.notification_url = `${process.env.API_URL}/api/subscriptions/webhook`;
        }

        try {
            const response = await mercadopago.preapproval.create(preapprovalData);
            return {
                checkoutUrl: response.body.init_point,
                preapprovalId: response.body.id, // ID da pré-aprovação no Mercado Pago
            };
        } catch (error) {
            console.error("Erro ao criar pré-aprovação Mercado Pago:", error.response ? error.response.data : error.message);
            throw new Error(`Erro ao iniciar assinatura com Mercado Pago: ${error.message}`);
        }
    }

    /**
     * Processa webhooks de pré-aprovação (assinaturas).
     * @param {object} data - Dados do webhook.
     * @returns {object|null} Detalhes da pré-aprovação ou null.
     */
    async processPreapprovalWebhook(data) {
        // As notificações de pré-aprovação geralmente vêm com `topic=preapproval`
        // e o ID da pré-aprovação em `id`.
        if (data.topic === "preapproval" && data.id) {
            const preapproval = await mercadopago.preapproval.findById(data.id);
            if (preapproval.body) {
                // `preapproval.body.status` pode ser 'pending', 'authorized', 'cancelled', 'paused'
                // `preapproval.body.external_reference` é o ID que você enviou
                return {
                    preapprovalId: preapproval.body.id,
                    externalReference: preapproval.body.external_reference,
                    status: preapproval.body.status,
                    preapprovalDetails: preapproval.body,
                    type: 'preapproval'
                };
            }
        }
        return null;
    }

    /**
     * Cancela uma pré-aprovação existente no Mercado Pago.
     * @param {string} preapprovalId - O ID da pré-aprovação no Mercado Pago.
     * @returns {boolean} Sucesso da operação.
     */
    async cancelPreapproval(preapprovalId) {
        try {
            // A API de update para status 'cancelled'
            const response = await mercadopago.preapproval.update(preapprovalId, { status: 'cancelled' });
            return response.body && response.body.status === 'cancelled';
        } catch (error) {
            console.error("Erro ao cancelar pré-aprovação Mercado Pago:", error.response ? error.response.data : error.message);
            throw new Error(`Erro ao cancelar assinatura no Mercado Pago: ${error.message}`);
        }
    }
}
module.exports = new MercadoPagoService();
