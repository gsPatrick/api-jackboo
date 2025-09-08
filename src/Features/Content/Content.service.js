// src/Features/Content/Content.service.js

const { Character, Book, BookVariation, BookContentPage, sequelize, User } = require('../../models');
const { downloadAndSaveImage } = require('../../OpenAI/utils/imageDownloader');
const visionService = require('../../OpenAI/services/openai.service');
const leonardoService = require('../../OpenAI/services/leonardo.service');
const prompts = require('../../OpenAI/config/AIPrompts');
const TextToImageService = require('../../Utils/TextToImageService'); // Reativado
const { Op } = require('sequelize');
const popularityService = require('../Popularity/Popularity.service');


if (!process.env.APP_URL) {
  throw new Error("ERRO CRÍTICO: A variável de ambiente APP_URL não está definida.");
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class ContentService {

  async createCharacter(
    userId,
    file,
    name = null,
    userProvidedDescription
  ) {
    if (!file) throw new Error('A imagem do desenho é obrigatória.');
    if (!userProvidedDescription) throw new Error('A descrição do personagem é obrigatória.');
    
    const originalDrawingUrl = `/uploads/user-drawings/${file.filename}`;
    const publicImageUrl = `${process.env.APP_URL}${originalDrawingUrl}`;

    const initialName = name || "Analisando seu desenho...";
    const character = await Character.create({ userId, name: initialName, originalDrawingUrl });

    try {
      let detailedDescription = await visionService.describeImage(publicImageUrl, userProvidedDescription);

      const refusalKeywords = ["desculpe", "não posso", "i'm sorry", "i cannot", "i't"];
      const isRefusal = refusalKeywords.some(keyword => detailedDescription.toLowerCase().includes(keyword));

      if (isRefusal) {
        console.warn(`[ContentService] AVISO: A IA de visão se recusou a descrever a imagem para o personagem ${character.id}. Usando descrição padrão.`);
        detailedDescription = "um personagem de desenho animado, uma figura amigável com olhos grandes e um sorriso";
      }
      
      await character.update({ description: detailedDescription });

      const finalPrompt = prompts.CHARACTER_LEONARDO_BASE_PROMPT.replace('{{GPT_OUTPUT}}', detailedDescription);
      
      if (!name) {
        await character.update({ name: "Gerando sua arte..." });
      }

      const CHARACTER_ELEMENT_ID = "133022";

      const leonardoInitImageId = await leonardoService.uploadImageToLeonardo(file.path, file.mimetype);
      const generationId = await leonardoService.startImageGeneration(finalPrompt, leonardoInitImageId, CHARACTER_ELEMENT_ID);
      await character.update({ generationJobId: generationId });

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

      const localGeneratedUrl = await downloadAndSaveImage(finalImageUrl);
      
      const finalName = name || 'Novo Personagem';
      await character.update({ generatedCharacterUrl: localGeneratedUrl, name: finalName });
      
      return character;

    } catch (error) {
      console.error(`[ContentService] Erro fatal na criação do personagem ID ${character.id}:`, error.message);
      await character.destroy();
      throw error; 
    }
  }

  /**
   * FUNÇÃO UNIFICADA PARA CRIAR QUALQUER LIVRO
   */
  async createBook(creationData) {
    const {
      authorId,
      characterIds,
      bookType, // 'colorir' ou 'historia'
      theme,
      summary,
      title,
      pageCount,
      elementId,
      coverElementId,
    } = creationData;

    const t = await sequelize.transaction();
    let book;
    try {
      const characters = await Character.findAll({ where: { id: { [Op.in]: characterIds } } });
      if (characters.length !== characterIds.length) throw new Error('Um ou mais personagens são inválidos.');
      
      const mainCharacter = characters[0];
      const characterNames = characters.map(c => c.name).join(' e ');
      
      const finalTitle = title || (bookType === 'colorir' 
        ? `As Aventuras de ${characterNames} para Colorir` 
        : `A História de ${characterNames}: ${theme}`);
        
      const innerPageCount = pageCount || (bookType === 'colorir' ? 10 : 8);
      const totalPages = (bookType === 'historia' ? innerPageCount * 2 : innerPageCount) + 2;

      book = await Book.create({ authorId, mainCharacterId: mainCharacter.id, title: finalTitle, status: 'gerando', genre: theme, storyPrompt: { theme, summary } }, { transaction: t });
      await book.setCharacters(characters, { transaction: t });
      const bookVariation = await BookVariation.create({ bookId: book.id, type: bookType, format: 'digital_pdf', price: 0.00, coverUrl: '/placeholders/generating_cover.png', pageCount: totalPages }, { transaction: t });
      await t.commit();
      
      (async () => {
        try {
          if (bookType === 'colorir') {
            await this._generateColoringBookPages(book, bookVariation, characters, theme, innerPageCount, elementId, coverElementId);
          } else {
            await this._generateStoryBookPages(book, bookVariation, characters, theme, summary, innerPageCount, elementId, coverElementId);
          }

          await book.update({ status: 'publicado' });
          console.log(`[ContentService] Livro ID ${book.id} ("${book.title}") gerado e PUBLICADO com sucesso!`);
        } catch (genError) {
          console.error(`[ContentService] Erro na geração assíncrona do livro ID ${book.id}:`, genError.message);
          await book.update({ status: 'falha_geracao' });
        }
      })();

      return { message: "A criação do seu livro começou!", book };
    } catch (error) {
      await t.rollback();
      if (book) await book.update({ status: 'falha_geracao' });
      throw error;
    }
  }

  async _generateColoringBookPages(book, variation, characters, theme, pageCount, mioloElementId, capaElementId) {
    const totalPages = pageCount + 2;

    const coverGptDescription = await visionService.generateCoverDescription(book.title, theme, characters);
    const finalCoverPrompt = prompts.LEONARDO_STORY_ILLUSTRATION_PROMPT_BASE.replace('{{GPT_OUTPUT}}', `day time, cheerful scene, ${coverGptDescription}`);
    const localCoverUrl = await this.generateAndDownloadImage(finalCoverPrompt, capaElementId, 'illustration');
    await BookContentPage.create({ bookVariationId: variation.id, pageNumber: 1, pageType: 'cover_front', imageUrl: localCoverUrl, status: 'completed' });
    await variation.update({ coverUrl: localCoverUrl });

    const pagePrompts = await visionService.generateColoringBookStoryline(characters, theme, pageCount);
    if (!pagePrompts || pagePrompts.length === 0) {
        throw new Error("A IA (GPT) não retornou nenhum prompt para as páginas de colorir.");
    }
    for (let i = 0; i < pagePrompts.length; i++) {
        const pageNumber = i + 2;
        const finalPrompt = prompts.LEONARDO_COLORING_PAGE_PROMPT_BASE.replace('{{GPT_OUTPUT}}', pagePrompts[i]);
        const localPageUrl = await this.generateAndDownloadImage(finalPrompt, mioloElementId, 'coloring');
        await BookContentPage.create({ bookVariationId: variation.id, pageNumber, pageType: 'coloring_page', imageUrl: localPageUrl, status: 'completed' });
    }

    const finalBackCoverPrompt = prompts.LEONARDO_STORY_ILLUSTRATION_PROMPT_BASE.replace('{{GPT_OUTPUT}}', `night time, starry sky, peaceful scene, ${coverGptDescription}`);
    const localBackCoverUrl = await this.generateAndDownloadImage(finalBackCoverPrompt, capaElementId, 'illustration');
    await BookContentPage.create({ bookVariationId: variation.id, pageNumber: totalPages, pageType: 'cover_back', imageUrl: localBackCoverUrl, status: 'completed' });
  }

  async _generateStoryBookPages(book, variation, characters, theme, summary, sceneCount, mioloElementId, capaElementId) {
    const totalPages = (sceneCount * 2) + 2;

    const coverGptDescription = await visionService.generateCoverDescription(book.title, theme, characters);
    const finalCoverPrompt = prompts.LEONARDO_STORY_ILLUSTRATION_PROMPT_BASE.replace('{{GPT_OUTPUT}}', `day time, cheerful scene, ${coverGptDescription}`);
    const localCoverUrl = await this.generateAndDownloadImage(finalCoverPrompt, capaElementId, 'illustration');
    await BookContentPage.create({ bookVariationId: variation.id, pageNumber: 1, pageType: 'cover_front', imageUrl: localCoverUrl, status: 'completed' });
    await variation.update({ coverUrl: localCoverUrl });

    const storyPages = await visionService.generateStoryBookStoryline(characters, theme, summary, sceneCount);
    if (!storyPages || storyPages.length === 0) {
        throw new Error("A IA (GPT) não retornou nenhuma cena para a história.");
    }
    let currentPageNumber = 2;
    for (const scene of storyPages) {
        const finalIllustrationPrompt = prompts.LEONARDO_STORY_ILLUSTRATION_PROMPT_BASE.replace('{{GPT_OUTPUT}}', scene.illustration_prompt);
        const localIllustrationUrl = await this.generateAndDownloadImage(finalIllustrationPrompt, mioloElementId, 'illustration');
        await BookContentPage.create({ bookVariationId: variation.id, pageNumber: currentPageNumber++, pageType: 'illustration', imageUrl: localIllustrationUrl, status: 'completed' });
        
        // Gera a página de texto como uma imagem
        const textImageUrl = await TextToImageService.generateImage({ text: scene.page_text });
        await BookContentPage.create({ bookVariationId: variation.id, pageNumber: currentPageNumber++, pageType: 'text', imageUrl: textImageUrl, content: scene.page_text, status: 'completed' });
    }

    const finalBackCoverPrompt = prompts.LEONARDO_STORY_ILLUSTRATION_PROMPT_BASE.replace('{{GPT_OUTPUT}}', `night time, starry sky, peaceful scene, ${coverGptDescription}`);
    const localBackCoverUrl = await this.generateAndDownloadImage(finalBackCoverPrompt, capaElementId, 'illustration');
    await BookContentPage.create({ bookVariationId: variation.id, pageNumber: totalPages, pageType: 'cover_back', imageUrl: localBackCoverUrl, status: 'completed' });
  }

  async createColoringBook(userId, { characterIds, theme }) {
    const MIOLO_ELEMENT_ID = "133022";
    const CAPA_ELEMENT_ID = "133022";

    return this.createBook({
      authorId: userId,
      characterIds,
      bookType: 'colorir',
      theme,
      elementId: MIOLO_ELEMENT_ID,
      coverElementId: CAPA_ELEMENT_ID,
    });
  }

  async createStoryBook(userId, { characterIds, theme, summary }) {
    const MIOLO_ELEMENT_ID = "133022";
    const CAPA_ELEMENT_ID = "133022";
    
    return this.createBook({
      authorId: userId,
      characterIds,
      bookType: 'historia',
      theme,
      summary,
      elementId: MIOLO_ELEMENT_ID,
      coverElementId: CAPA_ELEMENT_ID,
    });
  }
  
  async generateAndDownloadImage(prompt, elementId, generationType = 'illustration') {
    if (!elementId) {
      throw new Error(`O Element ID para a geração do tipo '${generationType}' não foi fornecido.`);
    }

    console.log(`[LeonardoService] Solicitando imagem do tipo '${generationType}' com element '${elementId}'...`);
    const MAX_RETRIES = 3;
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const generationId = generationType === 'coloring'
                ? await leonardoService.startColoringPageGeneration(prompt, elementId)
                : await leonardoService.startStoryIllustrationGeneration(prompt, elementId);

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
            if (!finalImageUrl) throw new Error('Timeout esperando a imagem do Leonardo.AI.');
            
            return await downloadAndSaveImage(finalImageUrl, 'book-pages');
        } catch (error) {
            console.error(`Tentativa ${i + 1} de gerar imagem falhou: ${error.message}`);
            if (i === MAX_RETRIES - 1) throw error;
        }
    }
  }

  async findCharactersByUser(userId) {
    return Character.findAll({ where: { userId }, order: [['createdAt', 'DESC']] });
  }
  
  async findBooksByUser(userId) {
    const books = await Book.findAll({ 
      where: { authorId: userId }, 
      include: [
        { model: Character, as: 'mainCharacter', attributes: ['id', 'name', 'generatedCharacterUrl'] }, 
        { 
          model: BookVariation, 
          as: 'variations',
          attributes: ['id', 'type', 'format', 'price', 'coverUrl', 'pageCount'],
          limit: 1,
          order: [['price', 'ASC']]
        }
      ],
      order: [['createdAt', 'DESC']] 
    });

    const bookIds = books.map(book => book.id);
    const likesCounts = await popularityService.getCountsForMultipleEntities('Book', bookIds);
    let userLikedStatus = {};
    if (userId) {
      const likes = await sequelize.models.Like.findAll({
        where: { userId, likableType: 'Book', likableId: { [Op.in]: bookIds } },
        attributes: ['likableId']
      });
      userLikedStatus = likes.reduce((acc, like) => {
        acc[like.likableId] = true;
        return acc;
      }, {});
    }

    return books.map(book => {
      const bookJson = book.toJSON();
      return {
        ...bookJson,
        totalLikes: likesCounts[book.id] || 0,
        userLiked: userLikedStatus[book.id] || false,
        coverUrl: bookJson.variations?.[0]?.coverUrl
      };
    });
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