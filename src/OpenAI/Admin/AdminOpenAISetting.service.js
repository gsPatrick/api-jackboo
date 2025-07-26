// src/Features-Admin/AdminOpenAISetting.service.js

const { OpenAISetting, AdminAsset, sequelize } = require('../../models');

class AdminOpenAISettingService {
  async listSettings() {
    return OpenAISetting.findAll({
        order: [['type', 'ASC']],
        include: [
            { model: AdminAsset, as: 'baseAssets' },
            { model: OpenAISetting, as: 'helperPrompt', attributes: ['id', 'type', 'name'] }
        ]
    });
  }

  async findSettingByType(type) {
    const setting = await OpenAISetting.findOne({
        where: { type },
        include: [
            { model: AdminAsset, as: 'baseAssets' },
            { model: OpenAISetting, as: 'helperPrompt', attributes: ['id', 'type', 'name'] }
        ] 
    });
    if (!setting) {
      throw new Error(`Configuração OpenAI para o tipo "${type}" não encontrada.`);
    }
    return setting;
  }

  /**
   * MODIFICADO: Agora salva tanto o 'defaultElementId' (para o miolo) quanto o 'coverElementId' (para a capa).
   */
  async createOrUpdateSetting(type, data) {
    if (!data.name || !data.basePromptText) {
      throw new Error('Campos obrigatórios (name, basePromptText) não foram fornecidos.');
    }
    
    let finalSetting;

    await sequelize.transaction(async (t) => {
        // Converte strings vazias para null para campos opcionais
        if (data.helperPromptId === '') data.helperPromptId = null;
        if (data.defaultElementId === '') data.defaultElementId = null;
        if (data.coverElementId === '') data.coverElementId = null; // Trata o novo campo

        // Dados que serão usados para criar ou atualizar o registro
        const settingData = {
            name: data.name,
            basePromptText: data.basePromptText,
            helperPromptId: data.helperPromptId,
            defaultElementId: data.defaultElementId,
            coverElementId: data.coverElementId, // Adiciona o novo campo
            model: data.model,
            isActive: data.isActive,
            type: type
        };

        const [setting, created] = await OpenAISetting.findOrCreate({
            where: { type },
            defaults: settingData,
            transaction: t,
        });

        if (!created) {
            const updateData = { ...settingData };
            delete updateData.type;
            await setting.update(updateData, { transaction: t });
        }

        finalSetting = await OpenAISetting.findByPk(setting.id, {
            include: [
                { model: AdminAsset, as: 'baseAssets' },
                { model: OpenAISetting, as: 'helperPrompt', attributes: ['id', 'type', 'name'] }
            ],
            transaction: t,
        });

        if (!finalSetting) {
            throw new Error('Erro interno: Configuração não encontrada após criação/atualização.');
        }
    });

    return finalSetting;
  }

  async deleteSetting(type) {
    const setting = await OpenAISetting.findOne({ where: { type } });
    if (!setting) {
      throw new Error(`Configuração OpenAI para o tipo "${type}" não encontrada.`);
    }
    await setting.destroy();
    return { message: 'Configuração deletada com sucesso.' };
  }
}

module.exports = new AdminOpenAISettingService();