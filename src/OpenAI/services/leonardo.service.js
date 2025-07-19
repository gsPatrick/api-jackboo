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

  /**
   * Inicia a geração de uma imagem no Leonardo usando um modelo customizado
   * e retorna o ID do job para ser acompanhado via webhook.
   *
   * @param {string} prompt - O prompt de texto final, já com a descrição da IA de visão.
   * @param {string} referenceImageUrl - A URL da imagem enviada pelo usuário (o rabisco).
   * @returns {Promise<string>} O ID da geração para salvar no banco.
   */
  async startImageGeneration(prompt, referenceImageUrl) {
    try {
      // Este é o payload que enviaremos para o Leonardo.
      const generationPayload = {
        prompt: prompt,
        
        // --- PONTO CRÍTICO ---
        // Usamos o ID do seu modelo customizado treinado via API.
        // Este modelo já contém o estilo do "jackboo".
        modelId: "168f6afd-3d31-4009-adbd-46aedaa92f7b", // <-- SEU ID DEFINITIVO!
        
        // Parâmetros padrão para a geração
        num_images: 1,
        width: 1024,
        height: 1024,
        
        // Usamos 'imagePrompts' para guiar a FORMA da geração
        // com base no rabisco do usuário.
        imagePrompts: [referenceImageUrl],
        imagePromptWeight: 0.7, // Força da imagem guia. Ajuste entre 0.1 e 0.9.

        // Informamos ao Leonardo para nos notificar quando a imagem estiver pronta.
        webhookUrl: `${process.env.APP_URL}/api/webhooks/leonardo`,
      };

      console.log('[LeonardoService] Iniciando geração com Custom Model. Payload:', JSON.stringify(generationPayload, null, 2));
      const response = await axios.post(`${this.apiUrl}/generations`, generationPayload, { headers: this.headers });
      
      const generationId = response.data?.sdGenerationJob?.generationId;
      if (!generationId) {
        console.error("Resposta completa do Leonardo ao iniciar geração:", response.data);
        throw new Error('A API do Leonardo não retornou um ID de geração válido.');
      }
      
      console.log(`[LeonardoService] Geração iniciada com sucesso. Job ID: ${generationId}`);
      return generationId; // Retorna o ID imediatamente para salvar no banco.

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