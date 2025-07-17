const axios = require('axios');
const { BookVariation, Book } = require('../../../models'); // Importar modelos para obter dimensões

const FRENET_API_KEY = process.env.FRENET_API_KEY;
const FRENET_PASSWORD = process.env.FRENET_PASSWORD; // Se sua API da Frenet usar Basic Auth com senha
const FRENET_URL = 'https://api.frenet.com.br/shipping/api/v1/quote';

class ShippingService { // Nome mais genérico, pois pode ser qualquer transportadora
    /**
     * Calcula as opções de frete para um conjunto de itens.
     * @param {string} originZipCode - CEP de origem.
     * @param {string} destinationZipCode - CEP de destino.
     * @param {Array<object>} items - Array de objetos { bookVariationId: number, quantity: number }.
     * @returns {Array<object>} - Array de opções de frete com nome, preço, tempo de entrega, etc.
     */
    async calculateShipping(originZipCode, destinationZipCode, items) {
        if (!items || items.length === 0) {
            return []; // Não há itens para calcular frete
        }

        let totalWeight = 0; // Em kg
        let maxLen = 0, maxWid = 0, maxHeight = 0; // Para dimensões da caixa
        let hasPhysicalItems = false;

        const volumes = []; // Para Frenet, cada item pode ser um volume ou consolidar em um. Vamos consolidar.

        for (const item of items) {
            const variation = await BookVariation.findByPk(item.bookVariationId, {
                include: [{ model: Book, as: 'book', attributes: ['weight', 'length', 'width', 'height'] }]
            });

            if (!variation) {
                console.warn(`Variação de livro (ID: ${item.bookVariationId}) não encontrada para cálculo de frete.`);
                continue;
            }

            if (variation.format === 'physical') {
                hasPhysicalItems = true;
                const book = variation.book;
                totalWeight += book.weight * item.quantity;
                
                // Assumimos que a caixa precisa acomodar a maior dimensão de cada item
                // Em um cenário real, você teria uma lógica de empacotamento mais sofisticada
                maxLen = Math.max(maxLen, book.length);
                maxWid = Math.max(maxWid, book.width);
                maxHeight = Math.max(maxHeight, book.height);
            }
        }

        if (!hasPhysicalItems) {
            return []; // Não há itens físicos, então não há frete
        }

        // Simulação de dimensões mínimas para a caixa, caso os livros sejam pequenos
        // As APIs de frete geralmente têm um mínimo aceitável
        const minDimension = 10; // cm
        const minWeight = 0.1; // kg
        
        // As APIs de frete geralmente esperam dimensões da caixa, não do item individual.
        // Aqui, fazemos uma estimativa simples: soma dos pesos e maior dimensão.
        // Para múltiplos itens, uma caixa real seria maior que a maior dimensão individual.
        // Adicione um "padding" ou uma lógica mais robusta para empacotamento.
        const assumedBoxLength = Math.max(maxLen, minDimension) + 2; // +2cm para padding
        const assumedBoxWidth = Math.max(maxWid, minDimension) + 2;
        const assumedBoxHeight = Math.max(maxHeight, minDimension) + 2;
        const finalWeight = Math.max(totalWeight, minWeight);

        // Para Frenet, podemos enviar um único volume consolidado
        volumes.push({
            Weight: finalWeight,
            Length: assumedBoxLength,
            Height: assumedBoxHeight,
            Width: assumedBoxWidth,
            Quantity: 1, // Representa 1 pacote consolidado
            // Optional: Category, SKU, etc.
        });
        
        try {
            const requestBody = {
                SellerCEP: originZipCode,
                RecipientCEP: destinationZipCode,
                Volumes: volumes,
                // ShippingServiceCode: "04599,04014", // Exemplo de códigos de serviço (PAC, SEDEX)
            };

            const headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'token': FRENET_API_KEY,
            };

            // Se a Frenet usar Basic Auth ao invés de token no header, ajuste aqui:
            // const auth = { username: FRENET_API_KEY, password: FRENET_PASSWORD };

            const response = await axios.post(FRENET_URL, requestBody, { headers });

            // Formatar a resposta da Frenet
            const shippingOptions = response.data.ShippingSevicesArray.map(service => ({
                id: service.ServiceCode,
                name: service.ServiceDescription,
                price: parseFloat(service.ShippingPrice).toFixed(2),
                company: { name: service.Carrier.Name },
                deliveryTime: service.DeliveryTime, // Já vem formatado "3-5 dias" ou um número
                customDescription: `Entrega em até ${service.DeliveryTime} dias úteis.`
            }));

            return shippingOptions;

        } catch (error) {
            console.error("Erro ao calcular frete com Frenet/Correios:", error.response ? error.response.data : error.message);
            // Retorne um array vazio ou lance um erro específico
            throw new Error("Não foi possível calcular o frete. Por favor, tente novamente mais tarde.");
        }
    }
}

module.exports = new ShippingService();