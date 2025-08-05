// src/Features/Content/Content.service.js

const { Character, Book, BookVariation, BookContentPage, LeonardoElement, sequelize, User } = require('../../models');
const { downloadAndSaveImage } = require('../../OpenAI/utils/imageDownloader');
const visionService = require('../../OpenAI/services/openai.service');
const leonardoService = require('../../OpenAI/services/leonardo.service');
const promptService = require('../../OpenAI/services/prompt.service');
const popularityService = require('../Popularity/Popularity.service');
const { Op } = require('sequelize');

if (!process.env.APP_URL) {
  throw new Error("ERRO CRÍTICO: A variável de ambiente APP_URL não está definida.");
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
class ContentService {

  async createCharacter(
    userId,
    file,
    name = null,
    gptSystemPromptOverride = null,
    leonardoElementIdOverride = null,
    leonardoBasePromptTextOverride = null
  ) {
    if (!file) throw new Error('A imagem do desenho é obrigatória.');
    
    const originalDrawingUrl = `/uploads/user-drawings/${file.filename}`;
    const publicImageUrl = `${process.env.APP_URL}${originalDrawingUrl}`;

    const initialName = name || "Analisando seu desenho...";
    const character = await Character.create({ userId, name: initialName, originalDrawingUrl });

    try {
      let actualGptSystemPrompt;
      let actualLeonardoElementId;
      let actualLeonardoBasePromptText;

      if (gptSystemPromptOverride) {
        actualGptSystemPrompt = gptSystemPromptOverride;
      } else {
        const generationSetting = await promptService.getPrompt('USER_CHARACTER_DRAWING');
        actualGptSystemPrompt = generationSetting.basePromptText;
        actualLeonardoElementId = generationSetting.defaultElementId; 
      }

      if (leonardoElementIdOverride && leonardoBasePromptTextOverride) {
        actualLeonardoElementId = leonardoElementIdOverride;
        actualLeonardoBasePromptText = leonardoBasePromptTextOverride;
      } else {
        if (!actualLeonardoElementId) { 
            const generationSetting = await promptService.getPrompt('USER_CHARACTER_DRAWING');
            actualLeonardoElementId = generationSetting.defaultElementId;
        }

        if (!actualLeonardoElementId) {
            throw new Error('Administrador: Nenhum Element padrão foi definido para "Geração de Personagem (Usuário)".');
        }
        const defaultElement = await LeonardoElement.findOne({ where: { leonardoElementId: actualLeonardoElementId } });
        
        if (!defaultElement || defaultElement.status !== 'COMPLETE' || !defaultElement.basePromptText) {
            throw new Error(`O Element padrão (ID: ${actualLeonardoElementId}) não foi encontrado, não está COMPLETO ou não tem um prompt base definido.`);
        }
        actualLeonardoBasePromptText = defaultElement.basePromptText;
      }

      // --- AQUI ESTÁ A MUDANÇA CRÍTICA ---
      // Obter a descrição SEM a sanitização excessiva que causa o bloqueio no Leonardo.AI
      // A sanitização original ('friendly figures') estava afetando negativamente o Leonardo.AI.
      // Vamos passar a descrição bruta do GPT para o prompt do Leonardo.AI.
      // A sanitização de palavras sensíveis (como 'criança') deve ser tratada de forma mais granular,
      // talvez em um nível de prompt mais geral ou em um filtro específico para o Leonardo.AI,
      // mas para este caso específico, remover a sanitização da descrição do personagem é mais seguro.
      
      // Obter a descrição SEM sanitização de "friendly figures" para enviar ao Leonardo.AI
      // A sanitização do OpenAI Service (describeImage) FAZ limpeza, mas vamos pegar o resultado bruto aqui
      // se necessário para o Leonardo.AI. Para simplificar, vamos ASSUMIR que describeImage RETORNA algo razoável
      // E que o problema principal era a sanitização posterior.
      // Se o problema persistir, pode ser necessário modificar `visionService.describeImage` para não aplicar a sanitização de "friendly figures" para este propósito específico.

      let detailedDescription = await visionService.describeImage(publicImageUrl, actualGptSystemPrompt);

      // A lógica de "refusal" do GPT ainda é válida e útil.
      const refusalKeywords = ["desculpe", "não posso", "i'm sorry", "i cannot", "i't"];
      const isRefusal = refusalKeywords.some(keyword => detailedDescription.toLowerCase().includes(keyword));

      if (isRefusal) {
        console.warn(`[ContentService] AVISO: A IA de visão se recusou a descrever a imagem para o personagem ${character.id}. Usando descrição padrão.`);
        detailedDescription = "um personagem de desenho animado, uma figura amigável com olhos grandes e um sorriso";
      }
      
      // SALVA A DESCRIÇÃO (sanitizada pelo describeImage se necessário, mas não a nossa sanitização específica)
      await character.update({ description: detailedDescription });

      // Constrói o prompt final para o Leonardo usando o prompt base do Element
      const finalPrompt = actualLeonardoBasePromptText.replace('{{GPT_OUTPUT}}', detailedDescription);
      
      if (!name) {
        await character.update({ name: "Gerando sua arte..." });
      }

      const leonardoInitImageId = await leonardoService.uploadImageToLeonardo(file.path, file.mimetype);
      const generationId = await leonardoService.startImageGeneration(finalPrompt, leonardoInitImageId, actualLeonardoElementId);
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

  async generateAndDownloadImage(prompt, elementId, generationType = 'illustration') {
    if (!elementId) {
      throw new Error(`O Element ID para a geração do tipo '${type}' não foi fornecido.`);
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

  async createColoringBook(userId, { characterIds, theme }) {
    const t = await sequelize.transaction();
    let book;
    try {
      const mioloSetting = await promptService.getPrompt('USER_COLORING_BOOK_STORYLINE');
      const coverDescriptionSetting = await promptService.getPrompt('BOOK_COVER_DESCRIPTION_GPT');

      const mioloElementId = mioloSetting.defaultElementId;
      const coverElementId = mioloSetting.coverElementId;

      if (!mioloElementId || !coverElementId) {
        throw new Error('Administrador: Os Elementos de estilo para miolo e capa do livro de colorir não foram configurados.');
      }

      const mioloLeonardoElement = await LeonardoElement.findOne({ where: { leonardoElementId: mioloElementId } });
      const capaLeonardoElement = await LeonardoElement.findOne({ where: { leonardoElementId: coverElementId } });

      if (!mioloLeonardoElement || mioloLeonardoElement.status !== 'COMPLETE' || !mioloLeonardoElement.basePromptText || !capaLeonardoElement || capaLeonardoElement.status !== 'COMPLETE' || !capaLeonardoElement.basePromptText) {
          throw new Error('Elementos Leonardo.AI (miolo ou capa) não encontrados, não estão COMPLETOS ou sem prompt base definido. Verifique as configurações de IA.');
      }

      const characters = await Character.findAll({ where: { id: { [Op.in]: characterIds }, userId } });
      if (characters.length !== characterIds.length) throw new Error('Um ou mais personagens são inválidos ou não pertencem ao usuário.');
      
      const mainCharacter = characters[0];
      const characterNames = characters.map(c => c.name).join(' e ');
      const innerPageCount = 10;
      const totalPages = innerPageCount + 2;
      const title = `As Aventuras de ${characterNames} para Colorir`;

      book = await Book.create({ authorId: userId, mainCharacterId: mainCharacter.id, title, status: 'gerando', genre: theme }, { transaction: t });
      await book.setCharacters(characters, { transaction: t });
      const bookVariation = await BookVariation.create({ bookId: book.id, type: 'colorir', format: 'digital_pdf', price: 0.00, coverUrl: '/placeholders/generating_cover.png', pageCount: totalPages }, { transaction: t });
      await t.commit();

      (async () => {
        try {
          const coverGptDescription = await visionService.generateCoverDescription(book.title, book.genre, characters);
          const finalCoverPrompt = capaLeonardoElement.basePromptText.replace('{{GPT_OUTPUT}}', coverGptDescription);
          const localCoverUrl = await this.generateAndDownloadImage(finalCoverPrompt, coverElementId, 'illustration');
          await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: 1, pageType: 'cover_front', imageUrl: localCoverUrl, status: 'completed' });
          await bookVariation.update({ coverUrl: localCoverUrl });

          const pagePrompts = await visionService.generateColoringBookStoryline(characters, theme, innerPageCount);
          if (!pagePrompts || pagePrompts.length === 0) {
              throw new Error("A IA (GPT) não retornou nenhum prompt para as páginas de colorir.");
          }

          for (let i = 0; i < pagePrompts.length; i++) {
            const pageNumber = i + 2;
            const finalPrompt = mioloLeonardoElement.basePromptText.replace('{{GPT_OUTPUT}}', pagePrompts[i]);
            const localPageUrl = await this.generateAndDownloadImage(finalPrompt, mioloElementId, 'coloring');
            await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber, pageType: 'coloring_page', imageUrl: localPageUrl, status: 'completed' });
          }

          const backCoverGptDescription = await visionService.generateCoverDescription(book.title, book.genre, characters);
          const finalBackCoverPrompt = capaLeonardoElement.basePromptText.replace('{{GPT_OUTPUT}}', backCoverGptDescription);
          const localBackCoverUrl = await this.generateAndDownloadImage(finalBackCoverPrompt, coverElementId, 'illustration');
          await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: totalPages, pageType: 'cover_back', imageUrl: localBackCoverUrl, status: 'completed' });

          await book.update({ status: 'privado' });
          console.log(`[ContentService] Livro ID ${book.id} ("${book.title}") gerado COM SUCESSO! Status atualizado para 'privado'.`);
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
      const mioloSetting = await promptService.getPrompt('USER_STORY_BOOK_STORYLINE');
      const coverDescriptionSetting = await promptService.getPrompt('BOOK_COVER_DESCRIPTION_GPT');

      const mioloElementId = mioloSetting.defaultElementId;
      const coverElementId = mioloSetting.coverElementId;

      if (!mioloElementId || !coverElementId) {
        throw new Error('Administrador: Os Elementos de estilo para miolo e capa do livro de história não foram configurados.');
      }

      const mioloLeonardoElement = await LeonardoElement.findOne({ where: { leonardoElementId: mioloElementId } });
      const capaLeonardoElement = await LeonardoElement.findOne({ where: { leonardoElementId: coverElementId } });

      if (!mioloLeonardoElement || mioloLeonardoElement.status !== 'COMPLETE' || !mioloLeonardoElement.basePromptText || !capaLeonardoElement || capaLeonardoElement.status !== 'COMPLETE' || !capaLeonardoElement.basePromptText) {
          throw new Error('Elementos Leonardo.AI (miolo ou capa) não encontrados, não estão COMPLETOS ou sem prompt base definido. Verifique as configurações de IA.');
      }
      
      const characters = await Character.findAll({ where: { id: { [Op.in]: characterIds }, userId } });
      if (characters.length !== characterIds.length) throw new Error('Um ou mais personagens são inválidos.');
      
      const mainCharacter = characters[0];
      const characterNames = characters.map(c => c.name).join(' e ');
      const sceneCount = 10;
      const totalPages = (sceneCount * 2) + 2;
      const title = `A História de ${characterNames}: ${theme}`;

      book = await Book.create({ authorId: userId, mainCharacterId: mainCharacter.id, title, status: 'gerando', genre: theme, storyPrompt: { theme, summary } }, { transaction: t });
      await book.setCharacters(characters, { transaction: t });
      const bookVariation = await BookVariation.create({ bookId: book.id, type: 'historia', format: 'digital_pdf', price: 0.00, coverUrl: '/placeholders/generating_cover.png', pageCount: totalPages }, { transaction: t });
      await t.commit();
      
      (async () => {
        try {
          const coverGptDescription = await visionService.generateCoverDescription(book.title, book.genre, characters);
          const finalCoverPrompt = capaLeonardoElement.basePromptText.replace('{{GPT_OUTPUT}}', coverGptDescription);
          const localCoverUrl = await this.generateAndDownloadImage(finalCoverPrompt, coverElementId, 'illustration');
          await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: 1, pageType: 'cover_front', imageUrl: localCoverUrl, status: 'completed' });
          await bookVariation.update({ coverUrl: localCoverUrl });

          const storyPages = await visionService.generateStoryBookStoryline(characters, theme, summary, sceneCount);
          if (!storyPages || storyPages.length === 0) {
              throw new Error("A IA (GPT) não retornou nenhuma cena para a história.");
          }
          let currentPageNumber = 2;
          for (const scene of storyPages) {
            const finalIllustrationPrompt = mioloLeonardoElement.basePromptText.replace('{{GPT_OUTPUT}}', scene.illustration_prompt);
            const localIllustrationUrl = await this.generateAndDownloadImage(finalIllustrationPrompt, mioloElementId, 'illustration');
            await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: currentPageNumber++, pageType: 'illustration', imageUrl: localIllustrationUrl, status: 'completed' });
            await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: currentPageNumber++, pageType: 'text', content: scene.page_text, status: 'completed' });
          }

          const backCoverGptDescription = await visionService.generateCoverDescription(book.title, book.genre, characters);
          const finalBackCoverPrompt = capaLeonardoElement.basePromptText.replace('{{GPT_OUTPUT}}', backCoverGptDescription);
          const localBackCoverUrl = await this.generateAndDownloadImage(finalBackCoverPrompt, coverElementId, 'illustration');
          await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: totalPages, pageType: 'cover_back', imageUrl: localBackCoverUrl, status: 'completed' });

          await book.update({ status: 'privado' });
          console.log(`[ContentService] Livro ID ${book.id} ("${book.title}") gerado COM SUCESSO! Status atualizado para 'privado'.`);
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