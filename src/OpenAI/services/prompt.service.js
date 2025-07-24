// src/OpenAI/services/prompt.service.js

const { OpenAISetting } = require('../../models');

class PromptService {
  /**
   * Busca uma configuração de IA ativa pelo seu tipo.
   * Lança um erro claro se a configuração não for encontrada.
   * @param {string} type - O tipo exato da configuração (ex: 'USER_character_drawing').
   * @returns {Promise<OpenAISetting>} O objeto de configuração do Sequelize.
   */
  async getPrompt(type) {
    // Futuramente, você pode adicionar um cache aqui para otimizar
    const setting = await OpenAISetting.findOne({
      where: {
        type,
        isActive: true,
      },
    });

    if (!setting) {
      console.error(`[PromptService] ALERTA CRÍTICO: A configuração de IA para o tipo "${type}" não foi encontrada no banco de dados ou está inativa. A funcionalidade dependente irá falhar.`);
      throw new Error(`Configuração de sistema para a ação "${type}" não está disponível. Contate o administrador.`);
    }

    return setting;
  }
}

module.exports = new PromptService();