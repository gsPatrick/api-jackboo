
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
   * Este método pode "ver" imagens de referência.
   * @param {Array<object>} messages - A estrutura de mensagens para a API, incluindo texto e imagens em base64.
   * @returns {string} URL da imagem gerada pela OpenAI.
   */
  async generateImageWithVision(messages) {
    try {
      // O GPT-4o vai analisar as imagens e o texto e gerar uma nova imagem internamente
      // usando o DALL-E 3, mas tudo em uma única chamada.
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // Usando o modelo mais recente e capaz
        messages: messages,
        max_tokens: 1024, // Limite para a resposta textual, se houver
      });

      // A resposta do GPT-4o pode conter texto. Precisamos encontrar onde ele descreve
      // a imagem que ele gerou ou o prompt que ele usou para gerar.
      // A OpenAI está simplificando isso. Vamos assumir que a resposta pode conter um prompt refinado.
      const refinedPrompt = response.choices[0].message.content;

      // Agora, com o prompt refinado pelo GPT-4o, geramos a imagem com DALL-E.
      // Este é o fluxo mais robusto e controlável.
      return this.generateImage(refinedPrompt);

    } catch (error) {
      console.error('Erro ao chamar a API GPT-4o da OpenAI:', error.response ? error.response.data : error.message);
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`Falha na geração com visão: ${errorMessage}`);
    }
  }

  /**
   * Gera uma imagem usando a API DALL-E (método antigo, agora usado pelo GPT-4o).
   * @param {string} prompt - O texto do prompt para a geração da imagem.
   * @param {object} options - Opções de geração.
   * @returns {string} URL da imagem gerada.
   */
  async generateImage(prompt, options = {}) {
    const {
      model = 'dall-e-3',
      size = '1024x1024',
      quality = 'standard',
      style = 'vivid'
    } = options;

    if (!prompt) {
      throw new Error('O prompt para geração de imagem não pode ser vazio.');
    }

    try {
      const response = await this.openai.images.generate({
        model: model,
        prompt: prompt,
        n: 1,
        size: size,
        quality: quality,
        style: style,
        response_format: 'url',
      });

      if (!response.data || response.data.length === 0 || !response.data[0].url) {
        throw new Error('Nenhuma imagem foi gerada pela OpenAI.');
      }

      return response.data[0].url;
    } catch (error) {
      console.error('Erro ao chamar a API DALL-E da OpenAI:', error.response ? error.response.data : error.message);
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`Falha na geração da imagem: ${errorMessage}`);
    }
  }
}

module.exports = new OpenAIService();