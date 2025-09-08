// src/OpenAI/services/translation.service.js

const OpenAI = require('openai');

class TranslationService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não está configurada.');
    }
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Traduz um texto para inglês usando o GPT.
   * Evita traduzir textos curtos (provavelmente nomes) ou textos sem letras.
   * @param {string} text - O texto a ser traduzido.
   * @returns {Promise<string>} O texto traduzido para inglês.
   */
  async translateToEnglish(text) {
    // Verificação para evitar traduções desnecessárias
    if (!text || typeof text !== 'string' || !/[a-zA-Z]/.test(text) || text.trim().split(' ').length <= 2) {
        // Não traduz se for:
        // - Nulo ou não for uma string
        // - Não contiver nenhuma letra do alfabeto (ex: "123")
        // - Tiver 2 palavras ou menos (para evitar traduzir nomes como "Kripto, o cachorro")
        return text;
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo", // Modelo rápido e eficiente para tradução
        messages: [
          {
            role: "system",
            content: "You are a translation assistant. Translate the user's text to English. Respond only with the translated text, without any additional explanations or introductory phrases."
          },
          {
            role: "user",
            content: text
          }
        ],
        temperature: 0.1, // Temperatura baixa para tradução mais precisa
        max_tokens: 1000,
      });

      const translatedText = response.choices[0].message.content.trim();
      console.log(`[TranslationService] Traduzido: "${text}" -> "${translatedText}"`);
      return translatedText;
      
    } catch (error) {
      console.error(`[TranslationService] Erro ao traduzir texto: "${text}"`, error.message);
      // Em caso de erro na API de tradução, retorna o texto original para não quebrar o fluxo principal.
      return text;
    }
  }
}

module.exports = new TranslationService();