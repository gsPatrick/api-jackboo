
// src/OpenAI/services/imageGeneration.service.js
const openaiService = require('./openai.service');
const { downloadAndSaveImage } = require('../utils/imageDownloader');
const { constructPrompt } = require('../utils/promptConstructor');
const { OpenAISetting, GeneratedImageLog, AdminAsset } = require('../../models');

class ImageGenerationService {

  /**
   * NOVO MÉTODO: Gera uma imagem usando o modelo multimodal GPT-4o.
   * Este método pode "ver" imagens de referência.
   * @param {Array<object>} messages - A estrutura de mensagens para a API, incluindo texto e imagens em base64.
   * @param {object} [options={}] - Opções para log, como userId e a entidade associada.
   * @returns {Promise<string>} A URL da imagem gerada e salva localmente.
   */
  async generateImageWithVision(messages, options = {}) {
    const { userId, entity } = options;
    let localImageUrl = null;
    let status = 'failed';
    let errorDetails = null;

    try {
      // 1. Chama o serviço da OpenAI (que acabamos de criar) para obter a URL da imagem.
      // Este método interno agora lida com a chamada multimodal.
      const openAiUrl = await openaiService.generateImageWithVision(messages);

      // 2. Se a chamada for bem-sucedida, baixa a imagem e salva localmente.
      localImageUrl = await downloadAndSaveImage(openAiUrl);
      status = 'success';

    } catch (error) {
      errorDetails = error.message;
      console.error(`[AI Vision Generation] Erro na geração de imagem com visão:`, errorDetails);
      // Relança o erro para que o chamador (characterGenerator) possa tratá-lo.
      throw new Error(`Falha ao gerar imagem com visão: ${errorDetails}`);
    } finally {
      // 3. Loga a tentativa de geração no banco de dados.
      if (entity) {
        // Extrai o prompt de texto para o log
        const textPrompt = messages.map(m =>
          Array.isArray(m.content) ? m.content.find(c => c.type === 'text')?.text : m.content
        ).filter(Boolean).join('\n---\n');

        await GeneratedImageLog.create({
          type: 'character_vision_simplified', // Novo tipo para identificar o fluxo
          userId: userId,
          associatedEntityId: entity.id,
          associatedEntityType: entity.constructor.name,
          inputPrompt: textPrompt,
          generatedImageUrl: localImageUrl,
          status,
          errorDetails,
          cost: 0.080, // Custo estimado para GPT-4o com imagem
        });
      }
    }
    
    // Retorna a URL da imagem salva localmente.
    return localImageUrl;
  }


  /**
   * Método antigo, baseado em DALL-E direto. Mantido para compatibilidade ou uso futuro.
   */
  async generateImage(prompt, options = {}) {
    const { userId, entity } = options;
    let localImageUrl = null;
    let status = 'failed';
    let errorDetails = null;

    try {
      const openAiUrl = await openaiService.generateImage(prompt);
      localImageUrl = await downloadAndSaveImage(openAiUrl);
      status = 'success';
    } catch (error) {
      errorDetails = error.message;
      console.error(`[AI Generation] Erro na geração de imagem:`, errorDetails);
      throw new Error(`Falha ao gerar imagem: ${errorDetails}`);
    } finally {
      if (entity) {
        await GeneratedImageLog.create({
          type: 'character_generation_simplified',
          userId: userId,
          associatedEntityId: entity.id,
          associatedEntityType: entity.constructor.name,
          inputPrompt: prompt,
          generatedImageUrl: localImageUrl,
          status,
          errorDetails,
          cost: 0.040,
        });
      }
    }
    
    return localImageUrl;
  }
}

module.exports = new ImageGenerationService();