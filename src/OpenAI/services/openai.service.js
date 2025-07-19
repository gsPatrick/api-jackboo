// src/OpenAI/services/openai.service.js

const OpenAI = require('openai');

class VisionService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não está configurada nas variáveis de ambiente.');
    }
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Analisa uma imagem e retorna uma descrição DETALHADA para ser usada como guia.
   * @param {string} imageUrl - A URL PÚBLICA da imagem a ser analisada.
   * @returns {Promise<string>} A descrição detalhada gerada pela IA.
   */
  async describeImage(imageUrl) {
    try {
      console.log(`[VisionService] Solicitando descrição DETALHADA para a imagem: ${imageUrl}`);
      
      const messages = [
        {
          role: "user",
          content: [
            {
              type: "text",
              // --- ESTE É O NOVO PROMPT DETALHADO PARA O GPT ---
              // Ele instrui a IA a ser um "diretor de arte" e a extrair o máximo de detalhes.
              text: "Você é um diretor de arte especializado em transformar desenhos infantis em personagens de desenho animado. Analise esta imagem e descreva-a com o máximo de detalhes possível para um ilustrador. Mencione a criatura (animal, monstro, etc.), suas características principais (orelhas, olhos, corpo, etc.), sua cor principal, a pose e qualquer elemento de fundo. Formate a resposta como uma lista de características separadas por vírgula."
            },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ];

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        max_tokens: 150, // Aumentamos um pouco para permitir uma resposta mais rica.
      });

      const description = response.choices[0].message.content.trim();
      console.log("[VisionService] Descrição detalhada recebida:", description);
      
      return description;

    } catch (error) {
      console.error('[VisionService] Erro ao chamar a API de visão:', error.response ? error.response.data : error.message);
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`Falha na análise da imagem: ${errorMessage}`);
    }
  }
}

module.exports = new VisionService();