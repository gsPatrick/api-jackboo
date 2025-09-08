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
   * @param {string} text - O texto a ser traduzido.
   * @returns {Promise<string>} O texto traduzido para inglês.
   */
  async translateToEnglish(text) {
    if (!text || typeof text !== 'string' || !/[a-zA-Z]/.test(text)) {
        return text; // Retorna o texto original se for vazio, não for string ou não contiver letras
    }

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo", // Um modelo mais rápido e barato é suficiente para tradução
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
        temperature: 0, // Baixa temperatura para traduções mais literais
        max_tokens: 1000,
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error(`[TranslationService] Erro ao traduzir texto: "${text}"`, error.message);
      return text; // Em caso de erro, retorna o texto original para não quebrar o fluxo
    }
  }
}

module.exports = new TranslationService();