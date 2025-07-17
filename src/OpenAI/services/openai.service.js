
const OpenAI = require('openai');

class OpenAIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não está configurada nas variáveis de ambiente.');
    }
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Gera uma imagem usando o modelo multimodal GPT-4o.
   * Este método é o ponto de entrada para a geração com visão.
   * @param {Array<object>} messages - A estrutura de mensagens para a API, incluindo texto e imagens.
   * @returns {string} A URL COMPLETA da imagem gerada pela OpenAI.
   */
  async generateImageWithVision(messages) {
    try {
      console.log("[OpenAIService] Chamando a API chat.completions com GPT-4o para análise de imagem e prompt.");
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        max_tokens: 1024,
      });

      // O GPT-4o retorna um prompt de texto otimizado baseado na sua análise.
      const refinedPrompt = response.choices[0].message.content;
      console.log("[OpenAIService] GPT-4o refinou o prompt para:", refinedPrompt);

      // Com o prompt refinado, usamos o DALL-E para a geração final da imagem.
      // A função generateImage() já retorna a URL completa da internet.
      return this.generateImage(refinedPrompt);

    } catch (error) {
      console.error('Erro ao chamar a API GPT-4o da OpenAI:', error.response ? error.response.data : error.message);
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`Falha na geração com visão: ${errorMessage}`);
    }
  }

  /**
   * Gera uma imagem usando a API DALL-E 3.
   * @param {string} prompt - O texto do prompt para a geração da imagem.
   * @returns {string} A URL COMPLETA da imagem gerada pela OpenAI.
   */
  async generateImage(prompt, options = {}) {
    if (!prompt) {
      throw new Error('O prompt para geração de imagem não pode ser vazio.');
    }

    try {
      console.log("[OpenAIService] Chamando a API images.generate com DALL-E 3.");
      const response = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt: prompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
        style: 'vivid',
        response_format: 'url',
      });

      if (!response.data || !response.data[0].url) {
        throw new Error('Nenhuma imagem foi gerada pela OpenAI.');
      }
      
      const openAiUrl = response.data[0].url;
      console.log("[OpenAIService] DALL-E retornou a URL da internet:", openAiUrl);
      
      // Retorna a URL completa da OpenAI, que será usada para o download.
      return openAiUrl;

    } catch (error) {
      console.error('Erro ao chamar a API DALL-E da OpenAI:', error.response ? error.response.data : error.message);
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`Falha na geração da imagem: ${errorMessage}`);
    }
  }
}

module.exports = new OpenAIService();