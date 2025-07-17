const { OpenAISetting, GeneratedImageLog, AdminAsset, OpenAISettingAsset, sequelize } = require('../../../models'); // Importar AdminAsset e OpenAISettingAsset

class AdminOpenAISettingService {
  /**
   * Lista todas as configurações da OpenAI.
   */
  async listSettings() {
    return OpenAISetting.findAll({
        order: [['type', 'ASC']],
        include: [{ model: AdminAsset, as: 'baseAssets' }] // Incluir os assets associados
    });
  }

  /**
   * Busca uma configuração por tipo.
   */
  async findSettingByType(type) {
    const setting = await OpenAISetting.findOne({
        where: { type },
        include: [{ model: AdminAsset, as: 'baseAssets' }] // Incluir os assets associados
    });
    if (!setting) {
      throw new Error(`Configuração OpenAI para o tipo "${type}" não encontrada.`);
    }
    return setting;
  }

  /**
   * Cria ou atualiza uma configuração da OpenAI.
   * @param {string} type - Tipo de configuração (ex: 'character_drawing').
   * @param {object} data - Dados da configuração (basePromptText, model, size, quality, style, isActive).
   * @param {Array<number>} [baseAssetIds] - IDs dos AdminAssets a serem associados.
   */
  async createOrUpdateSetting(type, data, baseAssetIds = []) {
    // Validações básicas
    if (!data.basePromptText || !data.model || !data.size || !data.quality || !data.style) {
      throw new Error('Campos obrigatórios (basePromptText, model, size, quality, style) não foram fornecidos.');
    }

    // Verificar se os baseAssetIds existem
    if (baseAssetIds && baseAssetIds.length > 0) {
        const existingAssets = await AdminAsset.count({ where: { id: { [sequelize.Op.in]: baseAssetIds } } });
        if (existingAssets !== baseAssetIds.length) {
            throw new Error('Um ou mais IDs de assets base fornecidos não são válidos.');
        }
    }

    let settingResult;
    await sequelize.transaction(async (t) => {
        const [setting, created] = await OpenAISetting.findOrCreate({
            where: { type },
            defaults: data,
            transaction: t,
        });

        if (!created) {
            await setting.update(data, { transaction: t });
        }

        // Gerenciar a tabela pivô OpenAISettingAsset
        await OpenAISettingAsset.destroy({ where: { openAISettingId: setting.id }, transaction: t });
        if (baseAssetIds && baseAssetIds.length > 0) {
            const settingAssetsToCreate = baseAssetIds.map(assetId => ({
                openAISettingId: setting.id,
                adminAssetId: assetId,
            }));
            await OpenAISettingAsset.bulkCreate(settingAssetsToCreate, { transaction: t });
        }
        settingResult = setting;
    });

    // Retorna a configuração com os assets associados para o preview
    return this.findSettingByType(type);
  }

  /**
   * Deleta uma configuração da OpenAI.
   */
  async deleteSetting(type) {
    const setting = await this.findSettingByType(type);
    if (!setting) throw new Error(`Configuração OpenAI para o tipo "${type}" não encontrada.`);

    await sequelize.transaction(async (t) => {
        // Remove as associações na tabela pivô primeiro
        await OpenAISettingAsset.destroy({ where: { openAISettingId: setting.id }, transaction: t });
        // Depois, deleta a configuração
        await setting.destroy({ transaction: t });
    });
    return { message: 'Configuração deletada com sucesso.' };
  }

  /**
   * Lista o histórico de imagens geradas (logs).
   * @param {object} filters - Filtros (type, status, userId, associatedEntityType, page, limit).
   */
  async listGeneratedImageLogs(filters = {}) {
    const { page = 1, limit = 10, type, status, userId, associatedEntityType, associatedEntityId } = filters;
    const whereClause = {};

    if (type) whereClause.type = type;
    if (status) whereClause.status = status;
    if (userId) whereClause.userId = userId;
    if (associatedEntityType) whereClause.associatedEntityType = associatedEntityType;
    if (associatedEntityId) whereClause.associatedEntityId = associatedEntityId;

    const { count, rows } = await GeneratedImageLog.findAndCountAll({
      where: whereClause,
      include: [
          { model: GeneratedImageLog.sequelize.models.User, as: 'generatorUser', attributes: ['id', 'nickname'] }
      ],
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      order: [['createdAt', 'DESC']],
    });

    return { totalItems: count, logs: rows, totalPages: Math.ceil(count / limit), currentPage: parseInt(page, 10) };
  }

 async listSettings() {
    return OpenAISetting.findAll({
      order: [['type', 'ASC']],
      include: [{ model: AdminAsset, as: 'baseAssets', attributes: ['id', 'name', 'url'] }]
    });
  }

  async findSettingByType(type) {
    const setting = await OpenAISetting.findOne({
      where: { type },
      include: [{ model: AdminAsset, as: 'baseAssets' }]
    });
    if (!setting) {
      throw new Error(`Configuração OpenAI para o tipo "${type}" não encontrada.`);
    }
    return setting;
  }

  /**
   * Cria ou atualiza uma configuração de IA.
   * @param {string} type - Tipo da configuração.
   * @param {object} data - Dados da configuração.
   * @param {Array<number>} [baseAssetIds=[]] - Array de IDs de AdminAsset a serem associados.
   */
  async createOrUpdateSetting(type, data, baseAssetIds = []) {
    return sequelize.transaction(async (t) => {
      const [setting, created] = await OpenAISetting.findOrCreate({
        where: { type },
        defaults: data,
        transaction: t,
      });

      if (!created) {
        await setting.update(data, { transaction: t });
      }

      // Se IDs de assets foram fornecidos, atualiza a associação
      if (baseAssetIds && Array.isArray(baseAssetIds)) {
        // Verifica se os assets existem
        const assets = await AdminAsset.findAll({ where: { id: baseAssetIds }, transaction: t });
        if (assets.length !== baseAssetIds.length) {
          throw new Error('Um ou mais IDs de assets base fornecidos não são válidos.');
        }
        // setBaseAssets é um "magic method" do Sequelize para associações N:M
        await setting.setBaseAssets(assets, { transaction: t });
      }
      
      return this.findSettingByType(type); // Retorna com os assets associados
    });
  }

}

module.exports = new AdminOpenAISettingService();