// src/OpenAI/services/prompt.service.js

const { OpenAISetting } = require('../../models');

class PromptService {
  /**
   * Busca uma configuração de IA ativa pelo seu propósito.
   * Lança um erro claro se a configuração não for encontrada.
   * @param {string} purpose - O propósito exato da configuração (ex: 'USER_CHARACTER_DESCRIPTION').
   * @returns {Promise<OpenAISetting>} O objeto de configuração do Sequelize.
   */
  async getPrompt(purpose) {
    // ✅ CORREÇÃO: Busca por 'purpose' em vez de 'type'.
    const setting = await OpenAISetting.findOne({
      where: {
        purpose,
        isActive: true,
      },
    });

    if (!setting) {
      console.error(`[PromptService] ALERTA CRÍTICO: A configuração de IA para o propósito "${purpose}" não foi encontrada no banco de dados ou está inativa. A funcionalidade dependente irá falhar.`);
      throw new Error(`Configuração de sistema para a ação "${purpose}" não está disponível. Contate o administrador.`);
    }

    return setting;
  }
}

module.exports = new PromptService();