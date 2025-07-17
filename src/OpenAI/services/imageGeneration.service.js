
const openaiService = require('./openai.service');
const { downloadAndSaveImage } = require('../utils/imageDownloader');
const { GeneratedImageLog } = require('../../models');

class ImageGenerationService {

  /**
   * Orquestra a geração de imagem com visão: chama a IA, baixa a imagem e loga.
   * @param {Array<object>} messages - A estrutura de mensagens para o GPT-4o.
   * @param {object} [options={}] - Opções para log (userId, entity).
   * @returns {Promise<string>} A URL LOCAL da imagem gerada e salva no nosso servidor.
   */
  async generateImageWithVision(messages, options = {}) {
    const { userId, entity } = options;
    let openAiUrl = null;
    let localImageUrl = null;
    let status = 'failed';
    let errorDetails = null;

    try {
      // 1. Chama o openaiService para obter a URL COMPLETA da OpenAI.
      console.log("[ImageGenerationService] Solicitando URL da OpenAI via openaiService...");
      openAiUrl = await openaiService.generateImageWithVision(messages);
      console.log("[ImageGenerationService] Recebida a URL da OpenAI:", openAiUrl);

      // 2. Com a URL da internet em mãos, agora podemos baixar a imagem.
      console.log("[ImageGenerationService] Baixando imagem para o armazenamento local...");
      localImageUrl = await downloadAndSaveImage(openAiUrl);
      console.log("[ImageGenerationService] Imagem salva localmente em:", localImageUrl);
      status = 'success';

    } catch (error) {
      errorDetails = error.message;
      console.error(`[ImageGenerationService] Erro durante a orquestração da geração com visão:`, errorDetails);
      throw new Error(`Falha ao orquestrar a geração com visão: ${errorDetails}`);
    } finally {
      // 3. Loga a tentativa de geração no banco de dados.
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
    
    // Retorna a URL LOCAL para o characterGenerator.
    return localImageUrl;
  }
}

module.exports = new ImageGenerationService();