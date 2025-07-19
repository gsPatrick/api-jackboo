// src/OpenAI/services/replicate.service.js

const axios = require('axios');
const { GeneratedImageLog } = require('../../models'); // Para logar o custo

// Função auxiliar para aguardar um tempo
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class ReplicateService {
  constructor() {
    this.token = process.env.REPLICATE_API_TOKEN;
    this.apiUrl = 'https://api.replicate.com/v1/predictions';
    if (!this.token) {
      throw new Error('REPLICATE_API_TOKEN não está configurado nas variáveis de ambiente.');
    }
    this.headers = {
      'Authorization': `Token ${this.token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Gera uma imagem usando um modelo no Replicate e aguarda o resultado.
   * @param {string} version - A versão do modelo a ser usado.
   * @param {object} input - O objeto de input para o modelo.
   * @returns {Promise<string>} A URL da imagem final gerada.
   */
  async generateImage(version, input) {
    try {
      // 1. Iniciar a predição
      console.log('[ReplicateService] Iniciando predição...');
      const startResponse = await axios.post(this.apiUrl, { version, input }, { headers: this.headers });
      
      let prediction = startResponse.data;
      const endpointUrl = prediction.urls.get;

      if (!endpointUrl) {
        throw new Error('A API do Replicate não retornou uma URL para polling.');
      }
      
      console.log(`[ReplicateService] Predição iniciada. Polling em: ${endpointUrl}`);

      // 2. Aguardar (fazer polling) pelo resultado
      while (prediction.status !== 'succeeded' && prediction.status !== 'failed' && prediction.status !== 'canceled') {
        await sleep(2000); // Espera 2 segundos entre as verificações
        const pollResponse = await axios.get(endpointUrl, { headers: this.headers });
        prediction = pollResponse.data;
        console.log(`[ReplicateService] Status da predição: ${prediction.status}`);
      }

      if (prediction.status !== 'succeeded') {
        throw new Error(`A predição falhou ou foi cancelada. Status: ${prediction.status}. Erro: ${prediction.error}`);
      }

      if (!prediction.output || prediction.output.length === 0) {
        throw new Error('A predição foi bem-sucedida, mas não retornou nenhuma imagem.');
      }
      
      // O custo é retornado em prediction.metrics.predict_time (em segundos)
      const cost = this.calculateCost(prediction.metrics.predict_time);
      console.log(`[ReplicateService] Imagem gerada com sucesso: ${prediction.output[0]}`);

      return {
        imageUrl: prediction.output[0],
        cost: cost
      };

    } catch (error) {
      const errorMessage = error.response?.data?.detail || error.message;
      console.error('[ReplicateService] Erro ao gerar imagem:', errorMessage);
      throw new Error(`Falha na comunicação com a API do Replicate: ${errorMessage}`);
    }
  }

  /**
   * Calcula o custo aproximado da geração.
   * Custo do modelo: ~$0.000725 por segundo em GPU A40 (Large).
   * Vamos usar um valor fixo por execução para simplificar, conforme a pesquisa.
   * @param {number} predictTime - Tempo de predição em segundos.
   * @returns {number} Custo em USD.
   */
  calculateCost(predictTime) {
      // Usando o valor fixo de $0.011 por execução, que é mais simples e direto.
      return 0.011;
  }
}

module.exports = new ReplicateService();