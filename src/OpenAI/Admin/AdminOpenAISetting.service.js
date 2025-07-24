// src/OpenAI/Admin/AdminOpenAISetting.service.js

const { OpenAISetting, AdminAsset, sequelize } = require('../../models');
const { Op } = require('sequelize');

class AdminOpenAISettingService {
  async listSettings() {
    return OpenAISetting.findAll({
        order: [['type', 'ASC']],
        include: [
            { model: AdminAsset, as: 'baseAssets' },
            // --- INCLUIR A NOVA ASSOCIAÇÃO ---
            { model: OpenAISetting, as: 'helperPrompt', attributes: ['id', 'type', 'name'] }
        ]
    });
  }

  async findSettingByType(type) {
    const setting = await OpenAISetting.findOne({
        where: { type },
        include: [
            { model: AdminAsset, as: 'baseAssets' },
            // --- INCLUIR A NOVA ASSOCIAÇÃO ---
            { model: OpenAISetting, as: 'helperPrompt', attributes: ['id', 'type', 'name'] }
        ] 
    });
    if (!setting) {
      throw new Error(`Configuração OpenAI para o tipo "${type}" não encontrada.`);
    }
    return setting;
  }

  // --- MÉTODO MODIFICADO ---
  async createOrUpdateSetting(type, data, baseAssetIds = []) {
    // Agora 'data' pode conter 'helperPromptId'
    if (!data.name || !data.basePromptText) {
      throw new Error('Campos obrigatórios (name, basePromptText) não foram fornecidos.');
    }
    
    if (baseAssetIds && baseAssetIds.length > 0) {
        const existingAssets = await AdminAsset.count({ where: { id: { [Op.in]: baseAssetIds } } }); 
        if (existingAssets !== baseAssetIds.length) {
            throw new Error('Um ou mais IDs de assets base fornecidos não são válidos.');
        }
    }

    let finalSetting;

    await sequelize.transaction(async (t) => {
        // Se helperPromptId for uma string vazia, converte para null
        if (data.helperPromptId === '') {
            data.helperPromptId = null;
        }

        const [setting, created] = await OpenAISetting.findOrCreate({
            where: { type },
            defaults: { ...data, type: type },
            transaction: t,
        });

        if (!created) {
            const updateData = { ...data };
            delete updateData.type;
            await setting.update(updateData, { transaction: t });
        }

        if (baseAssetIds && Array.isArray(baseAssetIds)) {
            const assets = await AdminAsset.findAll({ where: { id: baseAssetIds }, transaction: t });
            await setting.setBaseAssets(assets, { transaction: t });
        } else {
            await setting.setBaseAssets([], { transaction: t });
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

  // O método delete não precisa de alteração, o 'onDelete: SET NULL' cuida da referência.
  async deleteSetting(type) {
    const setting = await this.findSettingByType(type);
    if (!setting) throw new Error(`Configuração OpenAI para o tipo "${type}" não encontrada.`);
    await setting.destroy(); // Associações em cascata serão tratadas pelo DB/Sequelize
    return { message: 'Configuração deletada com sucesso.' };
  }
}

module.exports = new AdminOpenAISettingService();