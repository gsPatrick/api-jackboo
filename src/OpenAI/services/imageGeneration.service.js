// src/OpenAI/services/imageGeneration.service.js

const openaiService = require('./openai.service');
const replicateService = require('./replicate.service'); // <-- NOVO: Importa o serviço do Replicate
const { downloadAndSaveImage } = require('../utils/imageDownloader');
const { GeneratedImageLog } = require('../../models');
const { Op } = require('sequelize'); // <-- NOVO

class ImageGenerationService {

  /**
   * NOVO: Orquestra a geração de imagem com Replicate.
   * @param {string} version - Versão do modelo Replicate.
   * @param {object} input - Objeto de input para o Replicate.
   * @param {object} [options={}] - Opções para log (userId, entity).
   * @returns {Promise<string>} A URL LOCAL da imagem gerada.
   */
  async generateCharacterWithReplicate(version, input, options = {}) {
    const { userId, entity } = options;
    let remoteImageUrl = null;
    let localImageUrl = null;
    let status = 'failed';
    let errorDetails = null;
    let cost = 0;

    try {
      // 1. Chama o replicateService para obter a URL da imagem gerada.
      console.log("[ImageGenerationService] Solicitando imagem via Replicate...");
      const result = await replicateService.generateImage(version, input);
      remoteImageUrl = result.imageUrl;
      cost = result.cost;
      console.log("[ImageGenerationService] Replicate retornou a URL:", remoteImageUrl);

      // 2. Baixa a imagem para nosso armazenamento local.
      console.log("[ImageGenerationService] Baixando imagem para o armazenamento local...");
      localImageUrl = await downloadAndSaveImage(remoteImageUrl);
      console.log("[ImageGenerationService] Imagem salva localmente em:", localImageUrl);
      status = 'success';

    } catch (error) {
      errorDetails = error.message;
      console.error(`[ImageGenerationService] Erro durante a orquestração da geração com Replicate:`, errorDetails);
      throw new Error(`Falha ao orquestrar a geração com Replicate: ${errorDetails}`);
    } finally {
      // 3. Loga a tentativa no banco de dados.
      if (entity) {
        await GeneratedImageLog.create({
          type: 'character_replicate_ip_adapter', // <-- NOVO TIPO
          userId: userId,
          associatedEntityId: entity.id,
          associatedEntityType: entity.constructor.name,
          inputPrompt: JSON.stringify(input, null, 2), // Salva o input JSON completo
          generatedImageUrl: localImageUrl,
          status,
          errorDetails,
          cost, // Salva o custo calculado
        });
        console.log("[ImageGenerationService] Log de geração com Replicate salvo no banco de dados.");
      }
    }
    
    return localImageUrl;
  }

  /**
   * MÉTODO ANTIGO (mantido para outras funcionalidades)
   * Orquestra a geração de imagem com visão (OpenAI GPT-4o).
   * @param {Array<object>} messages - A estrutura de mensagens para o GPT-4o.
   * @param {object} [options={}] - Opções para log (userId, entity).
   * @returns {Promise<string>} A URL LOCAL da imagem gerada e salva.
   */
  async generateImageWithVision(messages, options = {}) {
    // ... (código existente deste método permanece inalterado) ...
    const { userId, entity } = options;
    let openAiUrl = null;
    let localImageUrl = null;
    let status = 'failed';
    let errorDetails = null;

    try {
      console.log("[ImageGenerationService] Solicitando URL da OpenAI via openaiService...");
      openAiUrl = await openaiService.generateImageWithVision(messages);
      console.log("[ImageGenerationService] Recebida a URL da OpenAI:", openAiUrl);

      console.log("[ImageGenerationService] Baixando imagem para o armazenamento local...");
      localImageUrl = await downloadAndSaveImage(openAiUrl);
      console.log("[ImageGenerationService] Imagem salva localmente em:", localImageUrl);
      status = 'success';

    } catch (error) {
      errorDetails = error.message;
      console.error(`[ImageGenerationService] Erro durante a orquestração da geração com visão:`, errorDetails);
      throw new Error(`Falha ao orquestrar a geração com visão: ${errorDetails}`);
    } finally {
      if (entity) {
        const textPrompt = messages.map(m =>
          Array.isArray(m.content) ? m.content.find(c => c.type === 'text')?.text : m.content
        ).filter(Boolean).join('\n---\n');

        await GeneratedImageLog.create({
          type: 'character_vision_simplified',
          userId: userId,
          associatedEntityId: entity.id,
          associatedEntityType: entity.constructor.name,
          inputPrompt: textPrompt,
          generatedImageUrl: localImageUrl,
          status,
          errorDetails,
          cost: 0.080,
        });
        console.log("[ImageGenerationService] Log de geração salvo no banco de dados.");
      }
    }
    
    return localImageUrl;
  }
}

module.exports = new ImageGenerationService();