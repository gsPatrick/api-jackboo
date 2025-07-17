
const openaiService = require('./openai.service');
const { downloadAndSaveImage } = require('../utils/imageDownloader');
const { constructPrompt } = require('../utils/promptConstructor');
const { OpenAISetting, GeneratedImageLog, AdminAsset } = require('../../models');

class ImageGenerationService {

  /**
   * Método genérico para gerar uma imagem a partir de um prompt de texto.
   * Usado agora pelo characterGenerator.
   * @param {string} prompt - O prompt de texto final para a IA.
   * @param {object} [options={}] - Opções como userId, associatedEntity.
   * @returns {Promise<string>} A URL da imagem gerada pela OpenAI.
   */
  async generateImage(prompt, options = {}) {
    if (!prompt) {
      throw new Error("O prompt para a geração de imagem não pode ser vazio.");
    }
    
    const { userId, entity } = options;
    let openAiGeneratedUrl = null;
    let localImageUrl = null;
    let status = 'failed';
    let errorDetails = null;

    try {
      // 1. Chama o serviço da OpenAI para obter a URL da imagem.
      openAiGeneratedUrl = await openaiService.generateImage(prompt, {
        model: 'dall-e-3', // Usando um padrão fixo para a geração simplificada
        size: '1024x1024',
        quality: 'standard',
        style: 'vivid',
      });
      
      // 2. Baixa a imagem e salva localmente.
      localImageUrl = await downloadAndSaveImage(openAiGeneratedUrl);
      status = 'success';

    } catch (error) {
      errorDetails = error.message;
      console.error(`[AI Generation] Erro na geração de imagem:`, errorDetails);
      // Relança o erro para que o chamador (characterGenerator) possa tratá-lo.
      throw new Error(`Falha ao gerar imagem: ${errorDetails}`);
    } finally {
      // 3. Loga a tentativa de geração no banco de dados.
      if (entity) {
          await GeneratedImageLog.create({
            type: 'character_generation_simplified', // Novo tipo para identificar o fluxo
            userId: userId,
            associatedEntityId: entity.id,
            associatedEntityType: entity.constructor.name,
            inputPrompt: prompt,
            generatedImageUrl: localImageUrl,
            status,
            errorDetails,
            cost: 0.040, // Custo fixo para DALL-E 3 Standard 1024x1024
          });
      }
    }
    
    // Retorna a URL da imagem salva localmente.
    return localImageUrl;
  }

  /**
   * Método antigo, baseado em templates. Pode ser mantido para uso do admin.
   * @deprecated para o fluxo simplificado do usuário.
   */
  async generateFromTemplate({ aiSettingId, book, userInputs = {}, page }) {
    if (!aiSettingId) {
      throw new Error("ID da configuração de IA (aiSettingId) é obrigatório.");
    }

    const aiSetting = await OpenAISetting.findByPk(aiSettingId, {
      include: [{ model: AdminAsset, as: 'baseAssets' }]
    });

    if (!aiSetting || !aiSetting.isActive) {
      throw new Error(`Configuração de IA com ID ${aiSettingId} não encontrada ou está inativa.`);
    }

    const context = { book, userInputs };
    const fullPrompt = constructPrompt(aiSetting.basePromptText, aiSetting.baseAssets, context);
    
    // Simplesmente reutiliza a lógica genérica de geração e log
    const localImageUrl = await this.generateImage(fullPrompt, { userId: book.authorId, entity: page });
    
    return localImageUrl;
  }
}

module.exports = new ImageGenerationService();