// src/Features-Admin/AdminOpenAISetting.service.js

const { OpenAISetting, sequelize, LeonardoElement } = require('../../models'); // ✅ Importado LeonardoElement para validação

class AdminOpenAISettingService {
  async listSettings() {
    // ✅ CORREÇÃO: Removido o 'include' para 'AdminAsset' que estava quebrando a query.
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
    if (!data.basePromptText) { // ✅ ATUALIZADO: basePromptText é obrigatório para o GPT
      throw new Error('O prompt base do GPT (basePromptText) é obrigatório.');
    }

    // ✅ NOVO: Validação dos elementIds
    if (data.defaultElementId) {
        const element = await LeonardoElement.findByPk(data.defaultElementId);
        if (!element) {
            throw new Error(`Elemento Leonardo.AI com ID ${data.defaultElementId} não encontrado para defaultElementId.`);
        }
    }
    if (data.coverElementId) {
        const element = await LeonardoElement.findByPk(data.coverElementId);
        if (!element) {
            throw new Error(`Elemento Leonardo.AI com ID ${data.coverElementId} não encontrado para coverElementId.`);
        }
    }
    
    let finalSetting;

    await sequelize.transaction(async (t) => {
        const settingData = {
            purpose: purpose,
            basePromptText: data.basePromptText,
            defaultElementId: data.defaultElementId || null,
            coverElementId: data.coverElementId || null,
            isActive: data.isActive,
        };

        // ✅ ATUALIZADO: Find by 'purpose' (já estava assim, apenas reforçando)
        const [setting, created] = await OpenAISetting.findOrCreate({
            where: { purpose },
            defaults: settingData,
            transaction: t,
        });

        if (!created) {
            const updateData = { ...settingData };
            delete updateData.purpose; // Não permite alterar o propósito
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