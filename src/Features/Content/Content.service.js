// src/Features/Content/Content.service.js

const { Character, Book, BookVariation, BookContentPage, LeonardoElement, sequelize, User } = require('../../models'); // Importar User
const { downloadAndSaveImage } = require('../../OpenAI/utils/imageDownloader');
const visionService = require('../../OpenAI/services/openai.service');
const leonardoService = require('../../OpenAI/services/leonardo.service');
const promptService = require('../../OpenAI/services/prompt.service');
const popularityService = require('../Popularity/Popularity.service'); // NOVO: Importar PopularityService
const { Op } = require('sequelize');

if (!process.env.APP_URL) {
  throw new Error("ERRO CRÍTICO: A variável de ambiente APP_URL não está definida.");
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
class ContentService {

 async createCharacter(userId, file, name = null) {
    if (!file) throw new Error('A imagem do desenho é obrigatória.');
    
    const originalDrawingUrl = `/uploads/user-drawings/${file.filename}`;
    const publicImageUrl = `${process.env.APP_URL}${originalDrawingUrl}`;

    const DEFAULT_DESCRIPTION_PROMPT = `
    
   Objetivo: Transformar qualquer desenho infantil, desde rabiscos até traços bem definidos, em uma descrição detalhada que preserve a originalidade e tente interpretar e adaptar o conteúdo a um personagem com forma reconhecível.
    
    Você recebeu um desenho infantil feito à mão. Sua tarefa é fazer uma descrição minuciosa e interpretativa da imagem enviada, com o objetivo de transformá-la em um personagem estilizado, fofo e visualmente profissional mais adiante.
	1.	Descreva todos os elementos visíveis: contornos, formas, cores, traços, rabiscos, preenchimentos, texturas e detalhes.
	2.	Analise possíveis partes do corpo: se forem identificáveis ou sugeridas, cite e descreva separadamente:

	•	Cabeça (forma, tamanho, posição)
	•	Rosto (olhos, boca, nariz, sobrancelhas)
	•	Corpo (formato geral, proporção)
	•	Braços, mãos, dedos (quantos, posições, gestos)
	•	Pernas, pés (tamanho, movimento, posição)
	•	Orelhas, chifres, cauda, asas ou elementos extras

	3.	Quando não houver definição clara, interprete os traços e sugira o que poderiam representar com base em formas comuns (ex: “esse círculo pode representar uma cabeça”; “essas linhas podem ser braços ou asas”).
	4.	Classifique o estilo do personagem, tentando inseri-lo em uma das categorias:

	•	Animal
	•	Boneco
	•	Monstro (estilo Monstros S.A., sempre fofo e amigável)

	5.	Se o desenho for puramente abstrato ou impossível de interpretar literalmente, crie uma interpretação livre com base na imaginação infantil, mantendo a proposta de transformar em um personagem com forma reconhecível.

O objetivo é gerar uma descrição completa e empática que permita que esse desenho seja transformado em um personagem encantador.
    
    
    `;

    const initialName = name || "Analisando seu desenho...";
    const character = await Character.create({ userId, name: initialName, originalDrawingUrl });

    try {
      const generationSetting = await promptService.getPrompt('USER_CHARACTER_DRAWING');
      const defaultElementId = generationSetting.defaultElementId;
      if (!defaultElementId) {
        throw new Error('Administrador: Nenhum Element padrão foi definido para "Geração de Personagem (Usuário)".');
      }

      const defaultElement = await LeonardoElement.findByPk(defaultElementId);
      if (!defaultElement || !defaultElement.basePromptText) {
          throw new Error(`O Element padrão (ID: ${defaultElementId}) não foi encontrado ou não tem um prompt base definido.`);
      }

      let detailedDescription = await visionService.describeImage(publicImageUrl, DEFAULT_DESCRIPTION_PROMPT);
      console.log(visionService.describeImage)
      const refusalKeywords = ["desculpe", "não posso", "i'm sorry", "i cannot", "i can't"];
      const isRefusal = refusalKeywords.some(keyword => detailedDescription.toLowerCase().includes(keyword));

      if (isRefusal) {
        console.warn(`[ContentService] AVISO: A IA de visão se recusou a descrever a imagem para o personagem ${character.id}. Usando descrição padrão.`);
        detailedDescription = "um personagem de desenho animado, uma figura amigável com olhos grandes e um sorriso";
      }
      
      await character.update({ description: detailedDescription });

      const finalPrompt = defaultElement.basePromptText.replace('{{DESCRIPTION}}', detailedDescription);
      const leonardoElementId = defaultElement.leonardoElementId;

      if (!name) {
        await character.update({ name: "Gerando sua arte..." });
      }

      const leonardoInitImageId = await leonardoService.uploadImageToLeonardo(file.path, file.mimetype);
      const generationId = await leonardoService.startImageGeneration(finalPrompt, leonardoInitImageId, leonardoElementId);
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
          attributes: ['id', 'type', 'format', 'price', 'coverUrl', 'pageCount'], // Incluir coverUrl
          limit: 1, // Pega apenas uma variação (a mais barata ou a principal)
          order: [['price', 'ASC']] // Exemplo: ordernar por preço para pegar a mais barata
        }
      ],
      order: [['createdAt', 'DESC']] 
    });

    // Para cada livro, buscar contagem de likes e se o usuário logado curtiu
    const bookIds = books.map(book => book.id);
    const likesCounts = await popularityService.getCountsForMultipleEntities('Book', bookIds);
    let userLikedStatus = {};
    if (userId) { // Se userId for fornecido (usuário logado)
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
        coverUrl: bookJson.variations?.[0]?.coverUrl // Adiciona coverUrl ao nível raiz para facilitar
      };
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
      const setting = await promptService.getPrompt('USER_COLORING_BOOK_GENERATION');
      const elementId = setting.defaultElementId;
      const coverElementId = setting.coverElementId;
      if (!elementId || !coverElementId) {
        throw new Error('Administrador: Os Elementos de estilo para miolo e capa do livro de colorir não foram configurados.');
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
          const coverPrompt = `Capa de livro de colorir com o título "${title}", apresentando ${characterNames}. Arte de linha clara, fundo branco.`;
          const localCoverUrl = await this.generateAndDownloadImage(coverPrompt, coverElementId, 'illustration');
          await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: 1, pageType: 'cover_front', imageUrl: localCoverUrl, status: 'completed' });
          await bookVariation.update({ coverUrl: localCoverUrl });

          const pagePrompts = await visionService.generateColoringBookStoryline(characters, theme, innerPageCount);
          for (let i = 0; i < pagePrompts.length; i++) {
            const pageNumber = i + 2;
            const finalPrompt = `página de livro de colorir, arte de linha, ${pagePrompts[i]}, linhas limpas, fundo branco`;
            const localPageUrl = await this.generateAndDownloadImage(finalPrompt, elementId, 'coloring');
            await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber, pageType: 'coloring_page', imageUrl: localPageUrl, status: 'completed' });
          }

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
      const setting = await promptService.getPrompt('USER_STORY_BOOK_GENERATION');
      const elementId = setting.defaultElementId;
      const coverElementId = setting.coverElementId;
      if (!elementId || !coverElementId) {
        throw new Error('Administrador: Os Elementos de estilo para miolo e capa do livro de história não foram configurados.');
      }
      
      const characters = await Character.findAll({ where: { id: { [Op.in]: characterIds }, userId } });
      if (characters.length !== characterIds.length) throw new Error('Um ou mais personagens são inválidos.');
      
      const mainCharacter = characters[0];
      const characterNames = characters.map(c => c.name).join(' e ');
      const sceneCount = 10;
      const totalPages = (sceneCount * 2) + 2;

      book = await Book.create({ authorId: userId, mainCharacterId: mainCharacter.id, title: theme, status: 'gerando', genre: theme, storyPrompt: { theme, summary } }, { transaction: t });
      await book.setCharacters(characters, { transaction: t });
      const bookVariation = await BookVariation.create({ bookId: book.id, type: 'historia', format: 'digital_pdf', price: 0.00, coverUrl: '/placeholders/generating_cover.png', pageCount: totalPages }, { transaction: t });
      await t.commit();
      
      (async () => {
        try {
          const coverPrompt = `Capa de livro de história infantil, título "${theme}", apresentando ${characterNames}. Ilustração rica e colorida.`;
          const localCoverUrl = await this.generateAndDownloadImage(coverPrompt, coverElementId, 'illustration');
          await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: 1, pageType: 'cover_front', imageUrl: localCoverUrl, status: 'completed' });
          await bookVariation.update({ coverUrl: localCoverUrl });

          const storyPages = await visionService.generateStoryBookStoryline(characters, theme, summary, sceneCount);
          let currentPageNumber = 2;
          for (const scene of storyPages) {
            const finalIllustrationPrompt = `ilustração de livro de história, ${scene.illustration_prompt}`;
            const localIllustrationUrl = await this.generateAndDownloadImage(finalIllustrationPrompt, elementId, 'illustration');
            await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: currentPageNumber++, pageType: 'illustration', imageUrl: localIllustrationUrl, status: 'completed' });
            await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: currentPageNumber++, pageType: 'text', content: scene.page_text, status: 'completed' });
          }

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