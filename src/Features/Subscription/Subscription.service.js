const { User, Plan, Subscription, sequelize } = require('../../../models');
const mercadopagoService = require('../../Utils/Payment/mercadoPago.service');
const { addMonths, addYears } = require('date-fns');

class SubscriptionService {
    /**
     * Inicia o processo de assinatura para um usuário em um plano específico.
     * @param {number} userId - ID do usuário.
     * @param {number} planId - ID do plano.
     * @returns {object} URL de checkout para o pagamento da assinatura.
     */
    async initiateSubscription(userId, planId) {
        const user = await User.findByPk(userId);
        const plan = await Plan.findByPk(planId);

        if (!user) throw new Error('Usuário não encontrado.');
        if (!plan) throw new Error('Plano não encontrado.');

        // Verificar se o usuário já tem uma assinatura ativa ou pendente
        const existingSubscription = await Subscription.findOne({
            where: {
                userId: userId,
                status: { [sequelize.Op.in]: ['active', 'pending', 'paused'] }
            }
        });

        if (existingSubscription) {
            throw new Error('Usuário já possui uma assinatura ativa ou pendente.');
        }

        // Criar a pré-aprovação no Mercado Pago
        const { checkoutUrl, preapprovalId } = await mercadopagoService.createPreapproval(plan.id, user.id);

        // Criar o registro de assinatura no seu DB como 'pending'
        await Subscription.create({
            userId: user.id,
            planId: plan.id,
            status: 'pending',
            gatewaySubscriptionId: preapprovalId, // ID da pré-aprovação do MP
            nextBillingDate: this._calculateNextBillingDate(new Date(), plan.frequency), // Data da primeira cobrança
        });

        return { checkoutUrl };
    }

    /**
     * Processa webhooks de pré-aprovação do Mercado Pago para assinaturas.
     * @param {object} webhookData - Dados do webhook do Mercado Pago.
     */
    async handlePreapprovalWebhook(webhookData) {
        const result = await mercadopagoService.processPreapprovalWebhook(webhookData);

        if (result && result.preapprovalId) {
            const subscription = await Subscription.findOne({ where: { gatewaySubscriptionId: result.preapprovalId } });

            if (!subscription) {
                console.warn(`Webhook de pré-aprovação recebido para ID ${result.preapprovalId}, mas assinatura não encontrada no DB.`);
                return;
            }

            // Mapear status do Mercado Pago para status interno
            let newStatus;
            switch (result.status) {
                case 'authorized': // Assinatura ativa, primeira cobrança aprovada
                    newStatus = 'active';
                    break;
                case 'pending': // Pagamento pendente
                    newStatus = 'pending';
                    break;
                case 'cancelled': // Assinatura cancelada
                    newStatus = 'canceled';
                    break;
                case 'paused': // Assinatura pausada
                    newStatus = 'paused';
                    break;
                default:
                    console.warn(`Status desconhecido do Mercado Pago para pré-aprovação: ${result.status}`);
                    return;
            }

            // Atualiza status da assinatura
            if (subscription.status !== newStatus) {
                await subscription.update({
                    status: newStatus,
                    // Se estiver ativo, recalcula a próxima data de cobrança
                    nextBillingDate: newStatus === 'active' ? this._calculateNextBillingDate(new Date(), subscription.plan.frequency) : subscription.nextBillingDate,
                    // Poderia armazenar mais detalhes do webhook aqui
                }, {
                    // Inclui o plano para o cálculo do nextBillingDate
                    include: [{ model: Plan, as: 'plan' }]
                });
                console.log(`Assinatura ${subscription.id} atualizada para status: ${newStatus}`);

                // Se a assinatura se tornou ativa, atualiza a role do usuário
                if (newStatus === 'active') {
                    await User.update({ role: 'subscriber' }, { where: { id: subscription.userId } });
                    console.log(`Usuário ${subscription.userId} atualizado para role 'subscriber'.`);
                } else if (newStatus === 'canceled' || newStatus === 'expired') { // Se cancelada ou expirada, reverte role
                    await User.update({ role: 'user' }, { where: { id: subscription.userId } });
                     console.log(`Usuário ${subscription.userId} atualizado para role 'user'.`);
                }
            }
        }
    }

    /**
     * Cancela a assinatura de um usuário.
     * @param {number} userId - ID do usuário.
     * @returns {boolean} Sucesso da operação.
     */
    async cancelUserSubscription(userId) {
        const subscription = await Subscription.findOne({
            where: { userId, status: 'active' },
            include: [{ model: Plan, as: 'plan' }]
        });

        if (!subscription) {
            throw new Error('Nenhuma assinatura ativa encontrada para este usuário.');
        }

        // Tentar cancelar no Mercado Pago
        const mpCancelled = await mercadopagoService.cancelPreapproval(subscription.gatewaySubscriptionId);

        if (mpCancelled) {
            await subscription.update({ status: 'canceled', nextBillingDate: null });
            await User.update({ role: 'user' }, { where: { id: userId } });
            console.log(`Assinatura do usuário ${userId} cancelada com sucesso.`);
            return true;
        } else {
            throw new Error('Falha ao cancelar assinatura no gateway de pagamento.');
        }
    }

    /**
     * Obtém os detalhes da assinatura ativa de um usuário.
     * @param {number} userId - ID do usuário.
     * @returns {Subscription} Objeto da assinatura.
     */
    async getUserSubscription(userId) {
        return Subscription.findOne({
            where: { userId, status: { [sequelize.Op.in]: ['active', 'paused'] } },
            include: [{ model: Plan, as: 'plan' }]
        });
    }

    /**
     * Calcula a próxima data de cobrança com base na frequência do plano.
     * @param {Date} startDate - Data base para o cálculo.
     * @param {string} frequency - 'monthly' ou 'yearly'.
     * @returns {Date} Próxima data de cobrança.
     */
    _calculateNextBillingDate(startDate, frequency) {
        if (frequency === 'monthly') {
            return addMonths(startDate, 1);
        } else if (frequency === 'yearly') {
            return addYears(startDate, 1);
        }
        return startDate; // Retorna a mesma data se a frequência for desconhecida
    }
}

module.exports = new SubscriptionService();
