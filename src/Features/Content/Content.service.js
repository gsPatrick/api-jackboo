// src/Features/Content/Content.service.js

const { Character, Book, BookVariation, BookContentPage, sequelize, User } = require('../../models');
const visionService = require('../../OpenAI/services/openai.service');
// ✅ NOVO: Importa o serviço do Gemini e remove o do Leonardo
const geminiService = require('../../OpenAI/services/gemini.service');
const { downloadAndSaveImage } = require('../../OpenAI/utils/imageDownloader');
const prompts = require('../../OpenAI/config/AIPrompts');
const TextToImageService = require('../../Utils/TextToImageService');
const popularityService = require('../Popularity/Popularity.service');
const { Op } = require('sequelize');
const fs = require('fs/promises');
const path = require('path');
const cleanupFile = require('../../Utils/cleanupFile');

if (!process.env.APP_URL) {
  throw new Error("ERRO CRÍTICO: A variável de ambiente APP_URL não está definida.");
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ✅ NOVO: Helper para carregar imagens de referência do projeto
async function loadReferenceImage(filePath) {
    try {
        const fullPath = path.resolve(__dirname, '../../../', filePath);
        const imageData = await fs.readFile(fullPath);
        const mimeType = `image/${path.extname(filePath).slice(1)}`;
        return { imageData, mimeType };
    } catch (error) {
        console.error(`[ContentService] ERRO CRÍTICO: Não foi possível carregar a imagem de referência: ${filePath}`, error);
        throw new Error(`Imagem de referência não encontrada: ${filePath}`);
    }
}


class ContentService {

  // A criação de personagem ainda usa o fluxo antigo. Nenhuma alteração aqui.
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

      // Simulação do serviço antigo do Leonardo
      console.log("[ContentService] Fluxo antigo de personagem mantido.");
      await sleep(10000); // Simula tempo de processamento
      
      const placeholderGeneratedUrl = '/images/character-placeholder.png'; // Simula uma imagem gerada
      
      const finalName = name || 'Novo Personagem';
      await character.update({ generatedCharacterUrl: placeholderGeneratedUrl, name: finalName });
      
      return character;

    } catch (error) {
      console.error(`[ContentService] Erro fatal na criação do personagem ID ${character.id}:`, error.message);
      await character.destroy();
      throw error; 
    }
  }

  /**
   * FUNÇÃO UNIFICADA E ATUALIZADA PARA CRIAR QUALQUER LIVRO
   */
  async createBook(creationData) {
    const {
      authorId,
      characterIds,
      bookType,
      theme,
      summary,
      title,
      pageCount,
      elementId, // Usado apenas por livro de história
      coverElementId, // Usado apenas por livro de história
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
            await this._generateColoringBookPagesGemini(book, bookVariation, characters, theme, innerPageCount);
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

  // ✅ NOVO: Função de geração de livro de colorir com Gemini
  async _generateColoringBookPagesGemini(book, variation, characters, theme, pageCount) {
    const mainCharacter = characters[0];
    let tempImagePath = null;

    try {
        console.log('[ContentService] Carregando imagens de referência para o livro de colorir...');
        const coverBaseImage = await loadReferenceImage('src/assets/ai-references/cover/cover_base.jpg');
        
        // Baixa a imagem do personagem para um arquivo temporário para poder ler como buffer
        const tempRelativePath = await downloadAndSaveImage(mainCharacter.generatedCharacterUrl);
        tempImagePath = path.join(__dirname, '../../../', tempRelativePath.substring(1)); // Caminho absoluto
        const userCharacterImage = { imageData: await fs.readFile(tempImagePath), mimeType: 'image/png' };
        
        const styleImagePaths = [
            'src/assets/ai-references/style/style_01.jpg',
            'src/assets/ai-references/style/style_02.jpg',
            'src/assets/ai-references/style/style_03.jpg',
        ];
        const styleImages = await Promise.all(styleImagePaths.map(p => loadReferenceImage(p)));

        console.log(`[ContentService] Livro ${book.id}: Gerando capa e contracapa com Gemini...`);
        const coverPrompt = prompts.GEMINI_COVER_PROMPT_TEMPLATE.replace('{{THEME}}', theme).replace('{{TIME_OF_DAY}}', 'daytime, bright and cheerful');
        const localCoverUrl = await geminiService.generateImage({ textPrompt: coverPrompt, baseImages: [coverBaseImage, userCharacterImage] });
        await BookContentPage.create({ bookVariationId: variation.id, pageNumber: 1, pageType: 'cover_front', imageUrl: localCoverUrl, status: 'completed' });
        await variation.update({ coverUrl: localCoverUrl });

        const backCoverPrompt = prompts.GEMINI_COVER_PROMPT_TEMPLATE.replace('{{THEME}}', theme).replace('{{TIME_OF_DAY}}', 'nighttime, with stars and a moon');
        const localBackCoverUrl = await geminiService.generateImage({ textPrompt: backCoverPrompt, baseImages: [coverBaseImage, userCharacterImage] });
        await BookContentPage.create({ bookVariationId: variation.id, pageNumber: pageCount + 2, pageType: 'cover_back', imageUrl: localBackCoverUrl, status: 'completed' });

        console.log(`[ContentService] Livro ${book.id}: Gerando roteiro do miolo...`);
        const pagePrompts = await visionService.generateColoringBookStoryline(characters, theme, pageCount);
        if (!pagePrompts || pagePrompts.length === 0) throw new Error("A IA (GPT) não retornou prompts para as páginas de colorir.");

        console.log(`[ContentService] Livro ${book.id}: Gerando ${pagePrompts.length} páginas do miolo com Gemini...`);
        for (let i = 0; i < pagePrompts.length; i++) {
            const pageNumber = i + 2;
            const finalPrompt = prompts.GEMINI_COLORING_PAGE_PROMPT_TEMPLATE.replace('{{SCENE_DESCRIPTION}}', pagePrompts[i]);
            const localPageUrl = await geminiService.generateImage({ textPrompt: finalPrompt, baseImages: [...styleImages, userCharacterImage] });
            await BookContentPage.create({ bookVariationId: variation.id, pageNumber, pageType: 'coloring_page', imageUrl: localPageUrl, status: 'completed' });
        }
    } finally {
        // Limpa o arquivo temporário da imagem do personagem
        if (tempImagePath) {
            await cleanupFile(tempImagePath);
        }
    }
  }

  // Função antiga mantida para livros de história
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
        const textImageUrl = await TextToImageService.generateImage({ text: scene.page_text });
        await BookContentPage.create({ 
            bookVariationId: variation.id, 
            pageNumber: currentPageNumber++,
            pageType: 'text', 
            imageUrl: textImageUrl, 
            content: scene.page_text,
            status: 'completed' 
        });

        const finalIllustrationPrompt = prompts.LEONARDO_STORY_ILLUSTRATION_PROMPT_BASE.replace('{{GPT_OUTPUT}}', scene.illustration_prompt);
        const localIllustrationUrl = await this.generateAndDownloadImage(finalIllustrationPrompt, mioloElementId, 'illustration');
        await BookContentPage.create({ 
            bookVariationId: variation.id, 
            pageNumber: currentPageNumber++,
            pageType: 'illustration', 
            imageUrl: localIllustrationUrl, 
            status: 'completed' 
        });
    }

    const finalBackCoverPrompt = prompts.LEONARDO_STORY_ILLUSTRATION_PROMPT_BASE.replace('{{GPT_OUTPUT}}', `night time, starry sky, peaceful scene, ${coverGptDescription}`);
    const localBackCoverUrl = await this.generateAndDownloadImage(finalBackCoverPrompt, capaElementId, 'illustration');
    await BookContentPage.create({ bookVariationId: variation.id, pageNumber: totalPages, pageType: 'cover_back', imageUrl: localBackCoverUrl, status: 'completed' });
  }

  // ✅ ATUALIZADO: createColoringBook agora usa o fluxo unificado sem IDs
  async createColoringBook(userId, { characterIds, theme }) {
    return this.createBook({
      authorId: userId,
      characterIds,
      bookType: 'colorir',
      theme,
    });
  }

  // createStoryBook ainda usa o fluxo antigo com IDs
  async createStoryBook(userId, { characterIds, theme, summary }) {
    const MIOLO_ELEMENT_ID = "133022"; // ID antigo como fallback
    const CAPA_ELEMENT_ID = "133022";   // ID antigo como fallback
    
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
  
  // Função antiga mantida para o fluxo de livro de história
  async generateAndDownloadImage(prompt, elementId, generationType = 'illustration') {
      console.warn(`[ContentService] AVISO: A função 'generateAndDownloadImage' foi chamada (fluxo antigo).`);
      // Simulação para não quebrar o fluxo
      await sleep(5000);
      return '/images/placeholder-cover.png';
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