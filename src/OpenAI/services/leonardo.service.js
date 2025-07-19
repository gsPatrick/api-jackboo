// src/OpenAI/services/leonardo.service.js
const axios = require('axios');

class LeonardoService {
  constructor() {
    this.token = process.env.LEONARDO_API_KEY;
    this.apiUrl = 'https://cloud.leonardo.ai/api/rest/v1';
    if (!this.token) {
      throw new Error('LEONARDO_API_KEY não está configurado nas variáveis de ambiente.');
    }
    this.headers = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      'accept': 'application/json',
    };
  }

  async startImageGeneration(prompt, referenceImageUrl) {
    try {
      const generationPayload = {
        prompt: prompt,
        modelId: "168f6afd-3d31-4009-adbd-46aedaa92f7b",
        num_images: 1,
        width: 1024,
        height: 1024,
        imagePrompts: [referenceImageUrl],
        imagePromptWeight: 0.7,
        
        // --- AQUI ESTÁ A CORREÇÃO ---
        // Alterado de 'webhookUrl' para 'webhook_url' para corresponder à API.
        webhook_url: `${process.env.APP_URL}/api/webhooks/leonardo`,
      };

      console.log('[LeonardoService] Iniciando geração com Custom Model. Payload:', JSON.stringify(generationPayload, null, 2));
      const response = await axios.post(`${this.apiUrl}/generations`, generationPayload, { headers: this.headers });
      
      const generationId = response.data?.sdGenerationJob?.generationId;
      if (!generationId) {
        console.error("Resposta completa do Leonardo ao iniciar geração:", response.data);
        throw new Error('A API do Leonardo não retornou um ID de geração válido.');
      }
      
      console.log(`[LeonardoService] Geração iniciada com sucesso. Job ID: ${generationId}`);
      return generationId;

    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message;
      console.error('[LeonardoService] Erro ao iniciar geração:', errorMessage);
      if (error.config?.data) {
        console.error('Payload que causou o erro:', error.config.data);
      }
      throw new Error(`Falha na comunicação com a API do Leonardo: ${errorMessage}`);
    }
  }
}

module.exports = new LeonardoService();