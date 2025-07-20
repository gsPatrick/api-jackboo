// src/Features/Content/Content.service.js
const { Character } = require('../../models');
const { downloadAndSaveImage } = require('../../OpenAI/utils/imageDownloader');
const visionService = require('../../OpenAI/services/openai.service');
const leonardoService = require('../../OpenAI/services/leonardo.service');

if (!process.env.APP_URL) {
  throw new Error("ERRO CRÍTICO: A variável de ambiente APP_URL não está definida.");
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class ContentService {
  async createCharacter(userId, file) {
    if (!file) throw new Error('A imagem do desenho é obrigatória.');
    
    // `publicImageUrl` é a URL da imagem no SEU servidor, usada pelo VisionService
    const originalDrawingUrl = `/uploads/user-drawings/${file.filename}`;
    const publicImageUrl = `${process.env.APP_URL}${originalDrawingUrl}`;

    console.log('[ContentService] Iniciando processo de criação de personagem (modo Polling)...');
    const character = await Character.create({
      userId,
      name: "Analisando seu desenho...",
      originalDrawingUrl,
    });

    try {
      await sleep(2000); 

      console.log(`[ContentService] Passo 1: Obtendo descrição da imagem para OpenAI Vision...`);
      const detailedDescription = await visionService.describeImage(publicImageUrl);
      
      if (detailedDescription.toLowerCase().includes("i'm sorry") || detailedDescription.toLowerCase().includes("i cannot")) {
          throw new Error("A IA de visão não conseguiu processar a imagem. Tente uma imagem diferente ou com mais detalhes.");
      }
      
      await character.update({ description: `Nossa IA entendeu seu desenho como: "${detailedDescription}".` });

      console.log('[ContentService] Passo 2: Construindo e limpando o prompt...');
      
      const cleanedDescription = detailedDescription
        .replace(/Claro! Aqui estão os elementos visuais principais descritos como um conceito de personagem:/i, '')
        .replace(/\n/g, ' ') 
        .replace(/-/g, '')   
        .trim();             

      const finalPrompt = `A cute character based on this detailed description: "${cleanedDescription}". The character must have a happy expression and be smiling, and should be facing forward. Create a full body 2D cartoon illustration on a simple white background.`;
      
      // --- NOVO PASSO CRÍTICO: UPLOAD DA IMAGEM GUIA PARA LEONARDO.AI ---
      console.log('[ContentService] Passo 3 (NOVO): Carregando imagem guia para Leonardo.Ai...');
      // file.path é o caminho local do arquivo temporário do Multer
      // file.mimetype é o tipo MIME do arquivo (ex: 'image/webp')
      const leonardoInitImageId = await leonardoService.uploadImageToLeonardo(file.path, file.mimetype);
      // --- FIM DO NOVO PASSO ---

      console.log('[ContentService] Passo 4: Solicitando INÍCIO da geração ao Leonardo...');
      // Agora passamos o ID da imagem que está AGORA nos servidores da Leonardo.Ai
      const generationId = await leonardoService.startImageGeneration(finalPrompt, leonardoInitImageId);
      
      await character.update({ generationJobId: generationId, name: "Gerando sua arte..." });

      console.log('[ContentService] Passo 5: Iniciando polling para o resultado...');
      let finalImageUrl = null;
      const MAX_POLLS = 20; // 20 * 5 segundos = 100 segundos de espera máxima
      for (let i = 0; i < MAX_POLLS; i++) {
        await sleep(5000); // Espera 5 segundos entre as verificações
        const result = await leonardoService.checkGenerationStatus(generationId);
        if (result.isComplete) {
          finalImageUrl = result.imageUrl;
          break;
        }
      }

      if (!finalImageUrl) {
        throw new Error("A geração da imagem demorou muito para responder ou falhou no polling.");
      }
      console.log(`[ContentService] Polling bem-sucedido! URL da imagem final do Leonardo: ${finalImageUrl}`);

      console.log('[ContentService] Passo 6: Baixando imagem final para armazenamento local...');
      const localGeneratedUrl = await downloadAndSaveImage(finalImageUrl);

      console.log('[ContentService] Passo 7: Finalizando personagem no banco de dados...');
      await character.update({
        generatedCharacterUrl: localGeneratedUrl,
        name: `Meu ${cleanedDescription.split(',')[0] || 'Amigo'}`
      });

      console.log('[ContentService] Personagem criado com sucesso!');
      return character;

    } catch (error) {
      console.error(`[ContentService] Erro fatal na criação do personagem ID ${character.id}:`, error.message);
      await character.update({
        name: 'Ops! Falha na Geração',
        description: `Ocorreu um erro durante o processo: ${error.message}`
      });
      // Re-lança o erro para que o middleware de tratamento de erro do Express o capture
      throw error; 
    }
  }

  async findCharactersByUser(userId) {
      const characters = await Character.findAll({ where: { userId }, order: [['createdAt', 'DESC']] });
      return characters;
  }
}

module.exports = new ContentService();