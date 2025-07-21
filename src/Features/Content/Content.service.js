// src/Features/Content/Content.service.js
const { Character, Book, BookVariation, BookContentPage } = require('../../models'); // Adicione Book, BookVariation, BookContentPage
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

  /**
   * Cria um livro de colorir de forma assíncrona.
   * @param {number} userId - O ID do usuário que está criando o livro.
   * @param {object} bookData - Dados para a criação do livro.
   * @param {number} bookData.characterId - O ID do personagem principal.
   * @param {number} bookData.pageCount - O número de páginas do livro.
   * @param {string} bookData.theme - O tema do livro de colorir.
   */
  async createColoringBook(userId, { characterId, pageCount, theme }) {
    // 1. Validação e busca do personagem
    const character = await Character.findOne({ where: { id: characterId, userId } });
    if (!character) {
      throw new Error('Personagem não encontrado ou não pertence ao usuário.');
    }

    // 2. Criação inicial dos registros no banco de dados
    console.log('[ContentService] Criando registros iniciais para o livro de colorir...');
    const book = await Book.create({
      authorId: userId,
      mainCharacterId: characterId,
      title: `As Aventuras de Colorir de ${character.name}: ${theme}`,
      status: 'gerando',
      // Outros campos como categoryId, ageRatingId podem ser definidos aqui
    });

    const bookVariation = await BookVariation.create({
      bookId: book.id,
      type: 'colorir',
      format: 'digital_pdf', // Assumindo digital por padrão
      price: 0.00, // Defina um preço se aplicável
      coverUrl: character.generatedCharacterUrl, // Usamos a imagem do personagem como capa temporária
      pageCount,
    });

    // 3. Inicia a geração em segundo plano (fire-and-forget)
    (async () => {
      try {
        const characterImageUrl = `${process.env.APP_URL}${character.generatedCharacterUrl}`;

        // Passo A: Gerar o roteiro com todos os prompts de página
        console.log('[ContentService] Gerando roteiro para as páginas...');
        const pagePrompts = await visionService.generateColoringBookStoryline({ name: character.name, imageUrl: characterImageUrl }, theme, pageCount);

        // Passo B: Gerar cada página individualmente
        for (let i = 0; i < pagePrompts.length; i++) {
          const pageNumber = i + 1;
          const prompt = pagePrompts[i];
          console.log(`[ContentService] Gerando página ${pageNumber}/${pageCount}: ${prompt}`);

          // Inicia a geração no Leonardo
          const generationId = await leonardoService.startColoringPageGeneration(prompt);

          // Polling para o resultado
          let finalImageUrl = null;
          const MAX_POLLS = 30; // Aumentar um pouco o polling se necessário
          for (let poll = 0; poll < MAX_POLLS; poll++) {
            await sleep(5000);
            const result = await leonardoService.checkGenerationStatus(generationId);
            if (result.isComplete) {
              finalImageUrl = result.imageUrl;
              break;
            }
          }

          if (!finalImageUrl) {
            throw new Error(`A geração da página ${pageNumber} demorou muito para responder.`);
          }

          // Baixa a imagem e salva localmente
          const localPageUrl = await downloadAndSaveImage(finalImageUrl, 'book-pages');

          // Salva a página no banco de dados
          await BookContentPage.create({
            bookVariationId: bookVariation.id,
            pageNumber,
            pageType: 'coloring_page',
            imageUrl: localPageUrl,
            illustrationPrompt: prompt,
          });
        }
        
        // Passo C: Finalizar o livro
        // Aqui você pode adicionar lógica para gerar uma capa final, um PDF, etc.
        console.log('[ContentService] Todas as páginas foram geradas com sucesso!');
        await book.update({ status: 'publicado' }); // Ou 'privado' se precisar de revisão

      } catch (error) {
        console.error(`[ContentService] Erro fatal na geração do livro de colorir ID ${book.id}:`, error.message);
        await book.update({
          status: 'falha_geracao',
          // talvez salvar o erro em um campo no model Book
        });
      }
    })();

    // 4. Retorna uma resposta imediata para o usuário
    return {
      message: "Seu livro de colorir começou a ser gerado! Ele aparecerá em sua biblioteca em breve.",
      book,
    };
  }

}

module.exports = new ContentService();