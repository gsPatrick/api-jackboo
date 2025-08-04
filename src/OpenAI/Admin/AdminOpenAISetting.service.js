// src/Features-Admin/AdminOpenAISetting.service.js

const { OpenAISetting, sequelize, LeonardoElement } = require('../../models');

class AdminOpenAISettingService {
  async listSettings() {
    return OpenAISetting.findAll({
        order: [['purpose', 'ASC']],
    });
  }

  async findSettingByPurpose(purpose) {
    const setting = await OpenAISetting.findOne({
        where: { purpose },
    });
    if (!setting) {
      throw new Error(`Configuração OpenAI para o propósito "${purpose}" não encontrada.`);
    }
    return setting;
  }

  async createOrUpdateSetting(purpose, data) {
    if (!data.basePromptText) {
      // O prompt base do GPT (basePromptText) é obrigatório para a maioria,
      // mas 'USER_CHARACTER_DRAWING' e 'BOOK_COVER_DESCRIPTION_GPT' podem ter um prompt fixo no backend.
      // A validação mais precisa deve ser feita no frontend ou um ENUM no backend.
      // Por enquanto, vou relaxar esta validação aqui, já que o frontend pode não enviar.
      // if (purpose !== 'USER_CHARACTER_DRAWING' && purpose !== 'BOOK_COVER_DESCRIPTION_GPT' && !data.basePromptText.trim()) {
      //   throw new Error('O prompt base do GPT (basePromptText) é obrigatório.');
      // }
    }

    // ✅ CORREÇÃO AQUI: Validar os elementIds usando findOne com leonardoElementId
    if (data.defaultElementId) {
        const element = await LeonardoElement.findOne({ where: { leonardoElementId: data.defaultElementId } });
        if (!element) {
            throw new Error(`Elemento Leonardo.AI com ID ${data.defaultElementId} não encontrado para defaultElementId.`);
        }
    }
    if (data.coverElementId) {
        const element = await LeonardoElement.findOne({ where: { leonardoElementId: data.coverElementId } });
        if (!element) {
            throw new Error(`Elemento Leonardo.AI com ID ${data.coverElementId} não encontrado para coverElementId.`);
        }
    }
    
    let finalSetting;

    await sequelize.transaction(async (t) => {
        const settingData = {
            purpose: purpose,
            basePromptText: data.basePromptText || '', // Garante que não seja null se não enviado
            defaultElementId: data.defaultElementId || null,
            coverElementId: data.coverElementId || null,
            isActive: data.isActive,
        };

        const [setting, created] = await OpenAISetting.findOrCreate({
            where: { purpose },
            defaults: settingData,
            transaction: t,
        });

        if (!created) {
            const updateData = { ...settingData };
            delete updateData.purpose;
            await setting.update(updateData, { transaction: t });
        }
        finalSetting = setting;
    });

    return finalSetting;
  }

  async deleteSetting(purpose) {
    const setting = await OpenAISetting.findOne({ where: { purpose } });
    if (!setting) {
      throw new Error(`Configuração OpenAI para o propósito "${purpose}" não encontrada.`);
    }
    await setting.destroy();
    return { message: 'Configuração deletada com sucesso.' };
  }
}

module.exports = new AdminOpenAISettingService();