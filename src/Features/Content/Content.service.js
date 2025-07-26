// src/Features/Content/Content.service.js

const { Character, Book, BookVariation, BookContentPage, sequelize } = require('../../models');
const { downloadAndSaveImage } = require('../../OpenAI/utils/imageDownloader');
const visionService = require('../../OpenAI/services/openai.service');
const leonardoService = require('../../OpenAI/services/leonardo.service');
const promptService = require('../../OpenAI/services/prompt.service');
const { Op } = require('sequelize');

if (!process.env.APP_URL) {
  throw new Error("ERRO CRÍTICO: A variável de ambiente APP_URL não está definida.");
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class ContentService {

  async createCharacter(userId, file) {
    if (!file) throw new Error('A imagem do desenho é obrigatória.');
    
    const originalDrawingUrl = `/uploads/user-drawings/${file.filename}`;
    const publicImageUrl = `${process.env.APP_URL}${originalDrawingUrl}`;

    const character = await Character.create({ userId, name: "Analisando seu desenho...", originalDrawingUrl });

    try {
      // 1. Buscar as configurações definidas pelo admin
      const descriptionPromptConfig = await promptService.getPrompt('USER_character_description');
      const generationPromptConfig = await promptService.getPrompt('USER_character_drawing');
      const elementId = generationPromptConfig.defaultElementId; // Pega o Element de estilo do personagem
      if (!elementId) {
        throw new Error('Administrador: O Elemento de estilo para geração de personagem não foi configurado no template "USER_character_drawing".');
      }

      // 2. Descrever a imagem
      const detailedDescription = await visionService.describeImage(publicImageUrl, descriptionPromptConfig.basePromptText);
      await character.update({ description: detailedDescription });

      // 3. Preparar e gerar
      const finalPrompt = generationPromptConfig.basePromptText.replace('{{DESCRIPTION}}', detailedDescription);
      const leonardoInitImageId = await leonardoService.uploadImageToLeonardo(file.path, file.mimetype);
      const generationId = await leonardoService.startImageGeneration(finalPrompt, leonardoInitImageId, elementId); // Passa o elementId
      await character.update({ generationJobId: generationId, name: "Gerando sua arte..." });

      // 4. Aguardar resultado (Polling)
      let finalImageUrl = null;
      const MAX_POLLS = 30;
      for (let i = 0; i < MAX_POLLS; i++) {
        await sleep(5000); 
        const result = await leonardoService.checkGenerationStatus(generationId);
        if (result.isComplete) {
          finalImageUrl = result.imageUrl;
          break;
        }
      }
      if (!finalImageUrl) throw new Error("A geração da imagem demorou muito para responder.");

      // 5. Salvar e finalizar
      const localGeneratedUrl = await downloadAndSaveImage(finalImageUrl);
      await character.update({ generatedCharacterUrl: localGeneratedUrl, name: 'Novo Personagem' });
      
      return character;

    } catch (error) {
      console.error(`[ContentService] Erro fatal na criação do personagem ID ${character.id}:`, error.message);
      await character.destroy(); // Deleta o personagem se a geração falhar
      throw error; 
    }
  }

  async findCharactersByUser(userId) {
    return Character.findAll({ where: { userId }, order: [['createdAt', 'DESC']] });
  }
  
  async findBooksByUser(userId) {
    return Book.findAll({ 
      where: { authorId: userId }, 
      include: [{ model: Character, as: 'mainCharacter' }, { model: BookVariation, as: 'variations' }],
      order: [['createdAt', 'DESC']] 
    });
  }

  async generateAndDownloadImage(prompt, elementId, generationType = 'illustration') {
    let generationId;
    if (generationType === 'coloring') {
      generationId = await leonardoService.startColoringPageGeneration(prompt, elementId);
    } else {
      generationId = await leonardoService.startStoryIllustrationGeneration(prompt, elementId);
    }
    
    let finalImageUrl = null;
    const MAX_POLLS = 30;
    for (let poll = 0; poll < MAX_POLLS; poll++) {
        await sleep(5000);
        const result = await leonardoService.checkGenerationStatus(generationId);
        if (result.isComplete) {
            finalImageUrl = result.imageUrl;
            break;
        }
    }

    if (!finalImageUrl) throw new Error(`A geração da imagem (${generationType}) demorou muito para responder.`);
    return await downloadAndSaveImage(finalImageUrl, 'book-pages');
  }

  async createColoringBook(userId, { characterIds, theme }) {
    const t = await sequelize.transaction();
    let book;
    try {
      // 1. Buscar o template de configuração do admin
      const setting = await promptService.getPrompt('USER_coloring_book_generation');
      const elementId = setting.defaultElementId;
      const coverElementId = setting.coverElementId;
      if (!elementId || !coverElementId) {
        throw new Error('Administrador: Os Elementos de estilo para miolo e capa do livro de colorir não foram configurados.');
      }

      // 2. Validar e buscar personagens
      const characters = await Character.findAll({ where: { id: { [Op.in]: characterIds }, userId } });
      if (characters.length !== characterIds.length) throw new Error('Um ou mais personagens são inválidos ou não pertencem ao usuário.');
      
      const mainCharacter = characters[0];
      const characterNames = characters.map(c => c.name).join(' e ');
      const innerPageCount = 10;
      const totalPages = innerPageCount + 2;
      const title = `As Aventuras de ${characterNames} para Colorir`;

      // 3. Criar registros no banco de dados
      book = await Book.create({ authorId: userId, mainCharacterId: mainCharacter.id, title, status: 'gerando', genre: theme }, { transaction: t });
      await book.setCharacters(characters, { transaction: t });
      const bookVariation = await BookVariation.create({ bookId: book.id, type: 'colorir', format: 'digital_pdf', price: 0.00, coverUrl: '/placeholders/generating_cover.png', pageCount: totalPages }, { transaction: t });
      await t.commit();

      // 4. Iniciar geração assíncrona
      (async () => {
        try {
          // A. Gerar Capa Frontal
          const coverPrompt = `Capa de livro de colorir com o título "${title}", apresentando ${characterNames}. Arte de linha clara, fundo branco.`;
          const localCoverUrl = await this.generateAndDownloadImage(coverPrompt, coverElementId, 'illustration');
          await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: 1, pageType: 'cover_front', imageUrl: localCoverUrl, status: 'completed' });
          await bookVariation.update({ coverUrl: localCoverUrl });

          // B. Gerar Roteiro e Miolo
          const pagePrompts = await visionService.generateColoringBookStoryline(characters, theme, innerPageCount);
          for (let i = 0; i < pagePrompts.length; i++) {
            const pageNumber = i + 2;
            const finalPrompt = `página de livro de colorir, arte de linha, ${pagePrompts[i]}, linhas limpas, fundo branco`;
            const localPageUrl = await this.generateAndDownloadImage(finalPrompt, elementId, 'coloring');
            await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber, pageType: 'coloring_page', imageUrl: localPageUrl, status: 'completed' });
          }

          // C. Gerar Contracapa
          const backCoverPrompt = `Contracapa de livro de colorir. Design simples com um pequeno ícone relacionado ao tema "${theme}".`;
          const localBackCoverUrl = await this.generateAndDownloadImage(backCoverPrompt, coverElementId, 'illustration');
          await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: totalPages, pageType: 'cover_back', imageUrl: localBackCoverUrl, status: 'completed' });

          await book.update({ status: 'privado' });
        } catch (genError) {
          console.error(`[ContentService] Erro na geração assíncrona do livro ID ${book.id}:`, genError.message);
          await book.update({ status: 'falha_geracao' });
        }
      })();

      return { message: "Seu livro de colorir começou a ser gerado!", book };
    } catch(error) {
      await t.rollback();
      if (book) await book.update({ status: 'falha_geracao' });
      throw error;
    }
  }

  async createStoryBook(userId, { characterIds, theme, summary }) {
    const t = await sequelize.transaction();
    let book;
    try {
      // 1. Buscar o template de configuração do admin
      const setting = await promptService.getPrompt('USER_story_book_generation');
      const elementId = setting.defaultElementId;
      const coverElementId = setting.coverElementId;
      if (!elementId || !coverElementId) {
        throw new Error('Administrador: Os Elementos de estilo para miolo e capa do livro de história não foram configurados.');
      }
      
      // 2. Validar e buscar personagens
      const characters = await Character.findAll({ where: { id: { [Op.in]: characterIds }, userId } });
      if (characters.length !== characterIds.length) throw new Error('Um ou mais personagens são inválidos.');
      
      const mainCharacter = characters[0];
      const characterNames = characters.map(c => c.name).join(' e ');
      const sceneCount = 10;
      const totalPages = (sceneCount * 2) + 2;

      // 3. Criar registros no banco
      book = await Book.create({ authorId: userId, mainCharacterId: mainCharacter.id, title: theme, status: 'gerando', genre: theme, storyPrompt: { theme, summary } }, { transaction: t });
      await book.setCharacters(characters, { transaction: t });
      const bookVariation = await BookVariation.create({ bookId: book.id, type: 'historia', format: 'digital_pdf', price: 0.00, coverUrl: '/placeholders/generating_cover.png', pageCount: totalPages }, { transaction: t });
      await t.commit();
      
      // 4. Iniciar geração assíncrona
      (async () => {
        try {
          // A. Gerar Capa Frontal
          const coverPrompt = `Capa de livro de história infantil, título "${theme}", apresentando ${characterNames}. Ilustração rica e colorida.`;
          const localCoverUrl = await this.generateAndDownloadImage(coverPrompt, coverElementId, 'illustration');
          await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: 1, pageType: 'cover_front', imageUrl: localCoverUrl, status: 'completed' });
          await bookVariation.update({ coverUrl: localCoverUrl });

          // B. Gerar Roteiro e Miolo
          const storyPages = await visionService.generateStoryBookStoryline(characters, theme, summary, sceneCount);
          let currentPageNumber = 2;
          for (const scene of storyPages) {
            const finalIllustrationPrompt = `ilustração de livro de história, ${scene.illustration_prompt}`;
            const localIllustrationUrl = await this.generateAndDownloadImage(finalIllustrationPrompt, elementId, 'illustration');
            await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: currentPageNumber++, pageType: 'illustration', imageUrl: localIllustrationUrl, status: 'completed' });
            await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: currentPageNumber++, pageType: 'text', content: scene.page_text, status: 'completed' });
          }

          // C. Gerar Contracapa
          const backCoverPrompt = `Contracapa de livro de história. Design elegante com uma imagem de ${mainCharacter.name} acenando adeus.`;
          const localBackCoverUrl = await this.generateAndDownloadImage(backCoverPrompt, coverElementId, 'illustration');
          await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: totalPages, pageType: 'cover_back', imageUrl: localBackCoverUrl, status: 'completed' });

          await book.update({ status: 'privado' });
        } catch (genError) {
          console.error(`[ContentService] Erro na geração assíncrona do livro ID ${book.id}:`, genError.message);
          await book.update({ status: 'falha_geracao' });
        }
      })();
      
      return { message: "Sua aventura começou a ser criada!", book };
    } catch (error) {
      await t.rollback();
      if (book) await book.update({ status: 'falha_geracao' });
      throw error;
    }
  }

  async updateCharacterName(characterId, userId, name) {
    const character = await Character.findOne({ where: { id: characterId, userId } });
    if (!character) throw new Error('Personagem não encontrado ou não pertence a você.');
    await character.update({ name });
    return character;
  }

  async getBookStatus(userId, bookId) {
    const book = await Book.findOne({
      where: { id: bookId, authorId: userId },
      attributes: ['id', 'status', 'title'],
      include: [{
        model: BookVariation, as: 'variations', attributes: ['id', 'type', 'coverUrl', 'pageCount'],
        include: [{ model: BookContentPage, as: 'pages', attributes: ['pageNumber', 'status', 'imageUrl', 'pageType'] }]
      }]
    });
    if (!book) throw new Error('Livro não encontrado ou não pertence ao usuário.');
    return book;
  }
}

module.exports = new ContentService();