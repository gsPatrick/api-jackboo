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

      console.log(`[ContentService] Passo 1: Obtendo descrição da imagem...`);
      const detailedDescription = await visionService.describeImage(publicImageUrl);
      
      if (detailedDescription.toLowerCase().includes("i'm sorry") || detailedDescription.toLowerCase().includes("i cannot")) {
          throw new Error("A IA de visão não conseguiu processar a imagem. Tente uma imagem diferente ou com mais detalhes.");
      }
      
      await character.update({ description: `Nossa IA entendeu seu desenho como: "${detailedDescription}".` });

      console.log('[ContentService] Passo 2: Construindo e limpando o prompt...');
      
      // --- AQUI ESTÁ A CORREÇÃO FINAL ---
      // Limpa a descrição para remover quebras de linha e texto introdutório.
      const cleanedDescription = detailedDescription
        .replace(/Claro! Aqui estão os elementos visuais principais descritos como um conceito de personagem:/i, '')
        .replace(/\n/g, ' ') // Substitui quebras de linha por espaços
        .replace(/-/g, '')   // Remove hífens
        .trim();             // Remove espaços no início e no fim

      const finalPrompt = `A cute character based on this detailed description: "${cleanedDescription}". The character must have a happy expression and be smiling, and should be facing forward. Create a full body 2D cartoon illustration on a simple white background.`;
      // --- FIM DA CORREÇÃO ---

      console.log('[ContentService] Passo 3: Solicitando INÍCIO da geração ao Leonardo...');
      const generationId = await leonardoService.startImageGeneration(finalPrompt, publicImageUrl);
      
      await character.update({ generationJobId: generationId, name: "Gerando sua arte..." });

      console.log('[ContentService] Passo 4: Iniciando polling para o resultado...');
      let finalImageUrl = null;
      const MAX_POLLS = 20;
      for (let i = 0; i < MAX_POLLS; i++) {
        await sleep(5000);
        const result = await leonardoService.checkGenerationStatus(generationId);
        if (result.isComplete) {
          finalImageUrl = result.imageUrl;
          break;
        }
      }

      if (!finalImageUrl) {
        throw new Error("A geração da imagem demorou muito para responder.");
      }
      console.log(`[ContentService] Polling bem-sucedido! URL da imagem: ${finalImageUrl}`);

      console.log('[ContentService] Passo 5: Baixando imagem final...');
      const localGeneratedUrl = await downloadAndSaveImage(finalImageUrl);

      console.log('[ContentService] Passo 6: Finalizando personagem...');
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
      throw error;
    }
  }

  async findCharactersByUser(userId) {
      const characters = await Character.findAll({ where: { userId }, order: [['createdAt', 'DESC']] });
      return characters;
  }
}

module.exports = new ContentService();