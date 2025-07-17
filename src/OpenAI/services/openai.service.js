const OpenAI = require('openai');

class OpenAIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não está configurada nas variáveis de ambiente.');
    }
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Gera uma imagem usando a API DALL-E da OpenAI.
   * @param {string} prompt - O texto do prompt para a geração da imagem.
   * @param {object} options - Opções de geração (model, size, quality, style).
   * @returns {string} URL da imagem gerada.
   */
  async generateImage(prompt, options = {}) {
    const {
      model = 'dall-e-3', // DALL-E 3 é o mais recente e melhor
      size = '1024x1024',
      quality = 'standard', // 'standard' ou 'hd' para DALL-E 3
      style = 'vivid' // 'vivid' ou 'natural' para DALL-E 3
    } = options;

    if (!prompt) {
      throw new Error('O prompt para geração de imagem não pode ser vazio.');
    }

    try {
      const response = await this.openai.images.generate({
        model: model,
        prompt: prompt,
        n: 1, // Número de imagens a gerar
        size: size,
        quality: quality,
        style: style,
        response_format: 'url', // 'url' ou 'b64_json'
      });

      if (!response.data || response.data.length === 0 || !response.data[0].url) {
        throw new Error('Nenhuma imagem foi gerada pela OpenAI.');
      }

      return response.data[0].url;
    } catch (error) {
      console.error('Erro ao chamar a API DALL-E da OpenAI:', error.response ? error.response.data : error.message);
      // Erros específicos do OpenAI podem ter structure.error.code e message
      const errorMessage = error.response && error.response.data && error.response.data.error 
                           ? error.response.data.error.message 
                           : error.message;
      throw new Error(`Falha na geração da imagem: ${errorMessage}`);
    }
  }
}

module.exports = new OpenAIService();
