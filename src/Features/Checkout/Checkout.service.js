const { Order, OrderItem, User, BookVariation, Book, ProductStock, Royalty, Setting, sequelize } = require('../../../models');
const ShippingService = require('../../Utils/Payment/shipping.service');
const mercadopagoService = require('../../Utils/Payment/mercadoPago.service');

class CheckoutService {
    /**
     * Calcula as opções de frete válidas para os itens de um carrinho.
     * Esta função atua como um intermediário para o ShippingService.
     * @param {string} originZipCode - CEP de origem (ex: do seu CD).
     * @param {string} destinationZipCode - CEP do cliente.
     * @param {Array<object>} cartItems - Array de objetos { bookVariationId: number, quantity: number }.
     */
    async calculateShippingOptions(originZipCode, destinationZipCode, cartItems) {
        return ShippingService.calculateShipping(originZipCode, destinationZipCode, cartItems);
    }

    /**
     * Cria um novo pedido, reserva estoque e armazena detalhes de frete.
     * @param {number} userId - ID do usuário.
     * @param {Array<object>} items - Array de objetos { bookVariationId: number, quantity: number }.
     * @param {object} address - Detalhes do endereço de entrega.
     * @param {object} shippingOption - Opção de frete selecionada { id: string, name: string, price: number }.
     * @returns {Order} - O objeto do pedido criado.
     */
    async createOrder(userId, items, address, shippingOption) {
        const t = await sequelize.transaction();
        try {
            let totalAmount = 0;
            const orderItemsData = [];
            let hasPhysicalItems = false;

            for (const item of items) {
                const variation = await BookVariation.findByPk(item.bookVariationId, { transaction: t });
                if (!variation) {
                    throw new Error(`Variação do produto (ID: ${item.bookVariationId}) não encontrada.`);
                }
                if (item.quantity <= 0) {
                    throw new Error(`Quantidade inválida para o item (ID: ${item.bookVariationId}).`);
                }

                const itemPrice = parseFloat(variation.price);
                totalAmount += itemPrice * item.quantity;

                orderItemsData.push({
                    bookVariationId: variation.id,
                    quantity: item.quantity,
                    unitPrice: itemPrice,
                });

                if (variation.format === 'physical') {
                    hasPhysicalItems = true;
                    const productStock = await ProductStock.findOne({ where: { variationId: variation.id }, transaction: t });

                    if (!productStock) {
                        throw new Error(`Estoque não gerenciado para a variação (ID: ${variation.id}).`);
                    }
                    if (productStock.available < item.quantity) {
                        throw new Error(`Estoque insuficiente para a variação "${variation.description}" (Disponível: ${productStock.available}, Solicitado: ${item.quantity}).`);
                    }

                    await productStock.update({
                        available: productStock.available - item.quantity,
                        reserved: productStock.reserved + item.quantity,
                    }, { transaction: t });
                }
            }

            let finalShippingCost = 0;
            let finalShippingMethodName = null;
            let finalShippingAddress = null;

            if (hasPhysicalItems) {
                if (!shippingOption || shippingOption.price === undefined || !shippingOption.name) {
                    throw new Error("Opção de frete inválida ou ausente para itens físicos.");
                }
                finalShippingCost = parseFloat(shippingOption.price);
                totalAmount += finalShippingCost;
                finalShippingMethodName = shippingOption.name;
                finalShippingAddress = address;
            }

            const order = await Order.create({
                userId,
                totalAmount: totalAmount.toFixed(2),
                paymentStatus: 'pending',
                shippingCost: finalShippingCost.toFixed(2),
                shippingMethod: finalShippingMethodName,
                shippingAddress: finalShippingAddress,
            }, { transaction: t });

            for (const itemData of orderItemsData) {
                await OrderItem.create({
                    orderId: order.id,
                    bookVariationId: itemData.bookVariationId,
                    quantity: itemData.quantity,
                    unitPrice: itemData.unitPrice,
                }, { transaction: t });
            }

            await t.commit();
            return order;
        } catch (error) {
            await t.rollback();
            console.error("Erro ao criar pedido e reservar estoque:", error);
            throw new Error("Erro ao criar o pedido: " + error.message);
        }
    }
    
    async initiatePayment(orderId, userId) {
        const order = await Order.findOne({ where: { id: orderId, userId }, include: [{ model: OrderItem, as: 'items' }] });
        if (!order) throw new Error("Pedido não encontrado.");
        if (order.paymentStatus !== 'pending') throw new Error("O pedido já foi pago ou está em outro status.");

        const preference = await mercadopagoService.createPreference(order.id, userId);

        order.gatewayOrderId = preference.preferenceId;
        await order.save();
        
        return preference.checkoutUrl;
    }
    
    /**
     * Processa o webhook de pagamento do Mercado Pago e atualiza o status do pedido e estoque.
     * Agora também gera royalties para o autor do livro, se aplicável.
     * @param {object} webhookData - Dados recebidos do webhook.
     */
    async handlePaymentWebhook(webhookData) {
        const result = await mercadopagoService.processWebhook(webhookData);
        if (result && result.orderId) {
            const order = await Order.findByPk(result.orderId, { 
                include: [{ 
                    model: OrderItem, 
                    as: 'items', 
                    include: [{ 
                        model: BookVariation, 
                        as: 'variation', 
                        include: [{ model: Book, as: 'book', include: ['author'] }] // Inclui o livro e seu autor
                    }] 
                }] 
            });
            
            if(!order) {
                console.warn(`Webhook recebido para Order ID ${result.orderId}, mas o pedido não foi encontrado.`);
                return;
            }

            let newStatus;
            switch (result.status) {
                case 'approved':
                    newStatus = 'paid';
                    // Inicia transação para garantir atomicidade da atualização de status e royalties/estoque
                    await sequelize.transaction(async (t) => {
                        // Lógica de Estoque
                        for (const item of order.items) {
                            if (item.variation.format === 'physical') {
                                const productStock = await ProductStock.findOne({ where: { variationId: item.bookVariationId }, transaction: t });
                                if (productStock && productStock.reserved >= item.quantity) {
                                    await productStock.update({ reserved: productStock.reserved - item.quantity }, { transaction: t });
                                } else {
                                    console.error(`Alerta de estoque: Variação ${item.bookVariationId} tem menos reservados (${productStock ? productStock.reserved : 'n/a'}) do que o esperado (${item.quantity}) para o pedido ${order.id}.`);
                                }
                            }

                            // --- LÓGICA DE GERAÇÃO DE ROYALTY ---
                            if (item.variation && item.variation.book && item.variation.book.author) {
                                const author = item.variation.book.author;
                                // Royalties apenas para autores que NÃO são usuários do sistema (JackBoo Oficial)
                                if (!author.isSystemUser) {
                                    const royaltyPercentageSetting = await Setting.findByPk('royalty_percentage');
                                    const royaltyPercentage = royaltyPercentageSetting ? parseFloat(royaltyPercentageSetting.value) : 0.20; // Padrão 20%
                                    
                                    const commissionAmount = parseFloat(item.unitPrice) * item.quantity * royaltyPercentage;

                                    await Royalty.create({
                                        authorId: author.id,
                                        orderItemId: item.id, // O item específico que gerou o royalty
                                        commissionAmount: commissionAmount.toFixed(2),
                                        status: 'pending', // Pending payout
                                        paymentDate: null, // Será preenchido quando o royalty for pago
                                    }, { transaction: t });
                                    console.log(`Royalty de R$${commissionAmount.toFixed(2)} gerado para o autor ${author.nickname} (ID: ${author.id}) do item ${item.id}.`);
                                }
                            }
                            // ------------------------------------
                        }

                        // Atualiza o status do pedido
                        if (order.paymentStatus !== newStatus) {
                            order.paymentStatus = newStatus;
                            order.paymentDetails = result.paymentDetails;
                            await order.save({ transaction: t });
                            console.log(`Pedido ${order.id} atualizado para status: ${newStatus}`);
                        }
                    });
                    break;

                case 'rejected':
                case 'cancelled':
                    newStatus = 'failed';
                    await sequelize.transaction(async (t) => {
                        for (const item of order.items) {
                            if (item.variation.format === 'physical') {
                                const productStock = await ProductStock.findOne({ where: { variationId: item.bookVariationId }, transaction: t });
                                if (productStock && productStock.reserved >= item.quantity) {
                                    await productStock.update({
                                        available: productStock.available + item.quantity,
                                        reserved: productStock.reserved - item.quantity,
                                    }, { transaction: t });
                                } else {
                                    console.error(`Alerta de estoque: Variação ${item.bookVariationId} tem menos reservados (${productStock ? productStock.reserved : 'n/a'}) do que o esperado (${item.quantity}) para o pedido ${order.id} em falha.`);
                                }
                            }
                            // TODO: Se royalties já foram gerados (e.g. status intermediário), aqui você deveria cancelá-los
                        }
                        if (order.paymentStatus !== newStatus) {
                            order.paymentStatus = newStatus;
                            order.paymentDetails = result.paymentDetails;
                            await order.save({ transaction: t });
                            console.log(`Pedido ${order.id} atualizado para status: ${newStatus}`);
                        }
                    });
                    break;
                case 'pending':
                default:
                    // Apenas atualiza o status se for uma transição relevante
                    if (order.paymentStatus !== newStatus) {
                        order.paymentStatus = newStatus;
                        order.paymentDetails = result.paymentDetails;
                        await order.save();
                        console.log(`Pedido ${order.id} atualizado para status: ${newStatus}`);
                    }
                    break;
            }
        }
    }

    async getUserOrders(userId) {
        return Order.findAll({
            where: { userId },
            include: [{
                model: OrderItem,
                as: 'items',
                include: [{
                    model: BookVariation,
                    as: 'variation',
                    include: ['book']
                }]
            }],
            order: [['createdAt', 'DESC']]
        });
    }

    async getUserDigitalProducts(userId) {
        const orders = await Order.findAll({
            where: { userId, paymentStatus: 'paid' },
            include: [{
                model: OrderItem,
                as: 'items',
                include: [{
                    model: BookVariation,
                    as: 'variation',
                    where: { format: 'digital_pdf' },
                    include: ['book']
                }]
            }]
        });

        const digitalBooks = new Map();
        orders.forEach(order => {
            order.items.forEach(item => {
                if (item.variation && item.variation.book) {
                    const book = item.variation.book;
                    if (!digitalBooks.has(book.id)) {
                        digitalBooks.set(book.id, {
                            id: book.id,
                            title: book.title,
                            coverUrl: item.variation.coverUrl,
                            downloads: []
                        });
                    }
                    digitalBooks.get(book.id).downloads.push({
                        variationId: item.variation.id,
                        type: item.variation.type,
                        description: item.variation.description,
                        content: item.variation.contentJson,
                    });
                }
            });
        });
        return Array.from(digitalBooks.values());
    }
}
module.exports = new CheckoutService();
