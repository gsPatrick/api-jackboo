// src/OpenAI/Admin/AdminOpenAISetting.service.js

const { OpenAISetting, GeneratedImageLog, AdminAsset, OpenAISettingAsset, sequelize } = require('../../models');

// Lista de tipos de IA que o sistema pode usar.
// Estes são os identificadores únicos.
const SYSTEM_AI_TYPES = [
    'character_drawing',
    'coloring_book_page',
    'story_book_illustration',
    'story_intro',
    'story_page_illustration',
    'story_page_text',
    'special_jack_friends',
    'back_cover',
    'story_cover',
    'coloring_cover',
];


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
   * @param {object} data - Dados da configuração (name, basePromptText, model, size, quality, style, isActive).
   * @param {Array<number>} [baseAssetIds] - IDs dos AdminAssets a serem associados.
   */
  async createOrUpdateSetting(type, data, baseAssetIds = []) {
    // Validações básicas, agora incluindo 'name'
    if (!data.name || !data.basePromptText || !data.model || !data.size || !data.quality || !data.style) {
      throw new Error('Campos obrigatórios (name, basePromptText, model, size, quality, style) não foram fornecidos.');
    }
    
    // Validar se os baseAssetIds existem
    if (baseAssetIds && baseAssetIds.length > 0) {
        const existingAssets = await AdminAsset.count({ where: { id: { [sequelize.Op.in]: baseAssetIds } } });
        if (existingAssets !== baseAssetIds.length) {
            throw new Error('Um ou mais IDs de assets base fornecidos não são válidos.');
        }
    }

    let finalSetting; // Variável para armazenar a configuração final com associações

    try {
        await sequelize.transaction(async (t) => {
            const [setting, created] = await OpenAISetting.findOrCreate({
                where: { type },
                // defaults deve incluir todos os campos obrigatórios para criação
                defaults: { ...data, type: type }, 
                transaction: t,
            });

            if (!created) {
                // Se não foi criado (já existia), atualiza os dados.
                // Remove 'type' dos dados de update para evitar erro de atualização de chave primária/única.
                const updateData = { ...data };
                delete updateData.type; 
                await setting.update(updateData, { transaction: t });
            }

            // Gerenciar a tabela pivô OpenAISettingAsset
            if (baseAssetIds && Array.isArray(baseAssetIds) && baseAssetIds.length > 0) {
                const assets = await AdminAsset.findAll({ where: { id: baseAssetIds }, transaction: t });
                await setting.setBaseAssets(assets, { transaction: t });
            } else {
                // Se baseAssetIds for vazio ou nulo, limpa as associações existentes
                await setting.setBaseAssets([], { transaction: t });
            }
            
            // Recarrega a configuração dentro da transação para garantir que as associações estejam carregadas
            finalSetting = await OpenAISetting.findByPk(setting.id, {
                include: [{ model: AdminAsset, as: 'baseAssets' }],
                transaction: t
            });
        });

        // Retorna a configuração completa e carregada após o commit da transação
        if (!finalSetting) {
            throw new Error(`Erro inesperado: Configuração para o tipo "${type}" não pôde ser recuperada após a operação de salvamento.`);
        }
        return finalSetting; 

    } catch (error) {
        console.error(`[AdminOpenAISettingService] Erro ao salvar/atualizar configuração para tipo "${type}":`, error);
        // Lançar um erro mais específico para o frontend
        if (error.name === 'SequelizeUniqueConstraintError') {
            throw new Error(`Já existe uma configuração com o tipo "${type}".`);
        }
        throw new Error(`Falha ao salvar a configuração de IA: ${error.message || 'Erro desconhecido.'}`);
    }
  }

  /**
   * Deleta uma configuração da OpenAI.
   */
  async deleteSetting(type) {
    const setting = await this.findSettingByType(type); // Reusa o find para validar a existência
    // if (!setting) { // Isso já é tratado pelo findSettingByType
    //     throw new Error(`Configuração OpenAI para o tipo "${type}" não encontrada.`);
    // }

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
}

module.exports = new AdminOpenAISettingService();