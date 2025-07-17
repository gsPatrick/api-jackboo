// src/OpenAI/Admin/AdminOpenAISetting.service.js

const { OpenAISetting, GeneratedImageLog, AdminAsset, OpenAISettingAsset, sequelize } = require('../../models');
const { Op } = require('sequelize'); // <-- CORREÇÃO: Importar Op do Sequelize

// Lista de tipos de IA que o sistema espera.
// Estes são os identificadores únicos para as configurações.
const SYSTEM_AI_TYPES = [
    'character_drawing',
    'coloring_book_page',
    'story_book_illustration',
    'story_intro',
    'story_page_text',
    'special_jack_friends', // Corrigido para ser consistente com BookStructureService.js
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
        include: [{ model: AdminAsset, as: 'baseAssets' }] 
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
    
    // Verificar se os baseAssetIds existem
    if (baseAssetIds && baseAssetIds.length > 0) {
        // CORREÇÃO: Usando Op importado diretamente
        const existingAssets = await AdminAsset.count({ where: { id: { [Op.in]: baseAssetIds } } }); 
        if (existingAssets !== baseAssetIds.length) {
            throw new Error('Um ou mais IDs de assets base fornecidos não são válidos.');
        }
    }

    let finalSetting; // Variável para armazenar o objeto final (com associações)

    await sequelize.transaction(async (t) => {
        const [setting, created] = await OpenAISetting.findOrCreate({
            where: { type },
            defaults: { ...data, type: type }, // Garante que o tipo da URL seja o usado para criação
            transaction: t,
        });

        if (!created) {
            // Se não foi criado (já existia), atualiza os dados
            const updateData = { ...data };
            delete updateData.type; // Não se deve atualizar o 'type' que é a chave única
            await setting.update(updateData, { transaction: t });
        }

        // Gerenciar a tabela pivô OpenAISettingAsset (associações N:M)
        if (baseAssetIds && Array.isArray(baseAssetIds)) {
            const assets = await AdminAsset.findAll({ where: { id: baseAssetIds }, transaction: t });
            await setting.setBaseAssets(assets, { transaction: t });
        } else {
            // Se baseAssetIds for vazio ou nulo, limpa as associações existentes
            await setting.setBaseAssets([], { transaction: t });
        }

        // Re-fetch o setting com suas associações *dentro da transação*
        // para garantir que 'finalSetting' tenha todos os dados e associações carregadas.
        finalSetting = await OpenAISetting.findByPk(setting.id, {
            include: [{ model: AdminAsset, as: 'baseAssets' }],
            transaction: t, // Importante passar a transação aqui também
        });

        if (!finalSetting) { // Caso excepcional: se a configuração sumir após a operação
            throw new Error('Erro interno: Configuração não encontrada após criação/atualização.');
        }
    });

    // Retorna o objeto completo que foi criado ou atualizado e populado dentro da transação.
    return finalSetting;
  }

  /**
   * Deleta uma configuração da OpenAI.
   */
  async deleteSetting(type) {
    const setting = await this.findSettingByType(type); // Reusa o método para encontrar
    if (!setting) throw new Error(`Configuração OpenAI para o tipo "${type}" não encontrada.`);

    await sequelize.transaction(async (t) => {
        // Remove as associações na tabela pivô primeiro
        // Usar magic method removeBaseAssets ou setBaseAssets([]) com um array vazio
        await setting.setBaseAssets([], { transaction: t }); 
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