// src/OpenAI/Admin/AdminOpenAISetting.service.js

const { OpenAISetting, AdminAsset, sequelize } = require('../../models');
const { Op } = require('sequelize');

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
   * MODIFICADO: Agora lida com todos os campos do formulário, incluindo o 'defaultElementId'.
   * O parâmetro 'baseAssetIds' foi removido pois não estava sendo usado no front-end recente.
   */
  async createOrUpdateSetting(type, data) {
    if (!data.name || !data.basePromptText) {
      throw new Error('Campos obrigatórios (name, basePromptText) não foram fornecidos.');
    }
    
    let finalSetting;

    await sequelize.transaction(async (t) => {
        // Converte strings vazias para null para as chaves estrangeiras e campos opcionais
        if (data.helperPromptId === '') {
            data.helperPromptId = null;
        }
        if (data.defaultElementId === '') {
            data.defaultElementId = null;
        }

        // Dados que serão usados para criar ou atualizar o registro
        const settingData = {
            name: data.name,
            basePromptText: data.basePromptText,
            helperPromptId: data.helperPromptId,
            defaultElementId: data.defaultElementId, // Novo campo
            model: data.model,
            isActive: data.isActive,
            type: type // Garante que o tipo seja sempre o da URL
        };

        const [setting, created] = await OpenAISetting.findOrCreate({
            where: { type },
            defaults: settingData,
            transaction: t,
        });

        if (!created) {
            // Se não foi criado, atualiza com os novos dados
            // Remove 'type' dos dados de atualização para evitar erros
            const updateData = { ...settingData };
            delete updateData.type;
            await setting.update(updateData, { transaction: t });
        }

        // Recarrega a instância com as associações para retornar ao front-end
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