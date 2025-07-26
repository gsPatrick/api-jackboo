// src/Features-Admin/AdminOpenAISetting.service.js

const { OpenAISetting, sequelize } = require('../../models'); // Removido AdminAsset

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
    if (!data.basePromptText && !data.defaultElementId) {
      throw new Error('Pelo menos um prompt ou um Element padrão deve ser fornecido.');
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