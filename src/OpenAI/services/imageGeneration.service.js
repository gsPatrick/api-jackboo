// src/OpenAI/services/imageGeneration.service.js
const openaiService = require('./openai.service');
const { downloadAndSaveImage } = require('../utils/imageDownloader');
const { constructPrompt } = require('../utils/promptConstructor'); // Usando o novo construtor
const { OpenAISetting, GeneratedImageLog, Character, Book, AdminAsset } = require('../../models');

class ImageGenerationService {

  /**
   * Ponto central para gerar uma imagem a partir de um template de IA.
   * Usado pelo BookCreationService.
   *
   * @param {object} options - As opções de geração.
   * @param {number} options.aiSettingId - O ID da configuração de IA a ser usada.
   * @param {Book} options.book - A instância do livro.
   * @param {object} [options.userInputs] - Inputs do usuário.
   * @param {BookPage} options.page - A instância da página do livro sendo gerada.
   * @returns {string} A URL da imagem gerada e salva localmente.
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

    // O contexto tem tudo que o construtor de prompt precisa
    const context = { book, userInputs };
    
    // Constrói o prompt final usando a lógica de substituição
    const fullPrompt = constructPrompt(aiSetting.basePromptText, aiSetting.baseAssets, context);
    
    // Executa a geração e o log
    return this._executeGenerationAndLog(fullPrompt, aiSetting, page);
  }

  /**
   * Método privado que executa a chamada à API, download e log.
   * @private
   */
  async _executeGenerationAndLog(prompt, aiSetting, entity) {
    let generatedImageUrl = null;
    let status = 'failed';
    let errorDetails = null;
    let generationCost = this._calculateCost(aiSetting);

    try {
      const openAiGeneratedUrl = await openaiService.generateImage(prompt, {
        model: aiSetting.model,
        size: aiSetting.size,
        quality: aiSetting.quality,
        style: aiSetting.style,
      });

      generatedImageUrl = await downloadAndSaveImage(openAiGeneratedUrl, 'book-pages'); // Salva em subpasta específica
      status = 'success';

    } catch (error) {
      errorDetails = error.message;
      console.error(`[AI Generation] Erro na geração de imagem:`, errorDetails);
    } finally {
      // O 'entity' pode ser uma página de livro (BookPage) ou um personagem (Character)
      const entityType = entity.constructor.name; // Ex: 'BookPage', 'Character'
      const entityId = entity.id;

      await GeneratedImageLog.create({
        type: aiSetting.type,
        userId: entity.userId || (entity.book ? entity.book.authorId : null),
        associatedEntityId: entityId,
        associatedEntityType: entityType,
        inputPrompt: prompt,
        generatedImageUrl,
        status,
        errorDetails,
        cost: generationCost,
      });
    }

    if (status === 'failed') {
      throw new Error(`Falha ao gerar imagem: ${errorDetails}`);
    }
    
    return generatedImageUrl;
  }
  
  /**
   * Calcula o custo estimado da geração da imagem.
   * @private
   */
  _calculateCost(aiSetting) {
    let cost = null;
    if (aiSetting.model === 'dall-e-3') {
        if (aiSetting.quality === 'hd' && aiSetting.size === '1792x1024') cost = 0.080;
        else if (aiSetting.quality === 'hd' && aiSetting.size === '1024x1024') cost = 0.040;
        else if (aiSetting.quality === 'standard' && aiSetting.size === '1792x1024') cost = 0.040;
        else if (aiSetting.quality === 'standard' && aiSetting.size === '1024x1024') cost = 0.020;
    } else if (aiSetting.model === 'dall-e-2') {
        if (aiSetting.size === '1024x1024') cost = 0.020;
        else if (aiSetting.size === '512x512') cost = 0.018;
        else if (aiSetting.size === '256x256') cost = 0.016;
    }
    return cost;
  }
}

module.exports = new ImageGenerationService();