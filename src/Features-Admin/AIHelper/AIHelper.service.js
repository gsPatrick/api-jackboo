// src/Features-Admin/AIHelper/AdminAIHelper.service.js
const OpenAI = require('openai');

class AdminAIHelperService {
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Executa um prompt genérico fornecido pelo administrador.
   * @param {string} userPrompt - O prompt exato que o admin digitou.
   * @returns {Promise<string>} O texto gerado pela IA.
   */
  async generateText(userPrompt) {
    if (!userPrompt) {
      throw new Error('O prompt do usuário não foi fornecido.');
    }

    try {
      console.log(`[AdminAIHelper] Executando prompt do admin: "${userPrompt}"`);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a creative assistant helping an administrator configure an AI content generation platform. Provide concise, helpful, and high-quality text based on the user's request. Be direct and avoid conversational fluff."
          },
          {
            role: "user",
            content: userPrompt
          }
        ],
        max_tokens: 200,
      });

      const generatedText = response.choices[0].message.content.trim();
      return generatedText;

    } catch (error) {
      console.error('[AdminAIHelper] Erro ao executar prompt genérico:', error.message);
      throw new Error('Falha ao comunicar com a IA para gerar o texto auxiliar.');
    }
  }
}

module.exports = new AdminAIHelperService();