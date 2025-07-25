// src/Features/Content/Content.service.js

const { Character, Book, BookVariation, BookContentPage } = require('../../models');
const { downloadAndSaveImage } = require('../../OpenAI/utils/imageDownloader');
const visionService = require('../../OpenAI/services/openai.service');
const leonardoService = require('../../OpenAI/services/leonardo.service');
const promptService = require('../../OpenAI/services/prompt.service');

if (!process.env.APP_URL) {
  throw new Error("ERRO CRÍTICO: A variável de ambiente APP_URL não está definida.");
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class ContentService {

  async createCharacter(userId, file) {
    if (!file) throw new Error('A imagem do desenho é obrigatória.');
    
    const originalDrawingUrl = `/uploads/user-drawings/${file.filename}`;
    const publicImageUrl = `${process.env.APP_URL}${originalDrawingUrl}`;

    console.log('[ContentService] Iniciando processo de criação de personagem...');
    const character = await Character.create({
      userId,
      name: "Analisando seu desenho...",
      originalDrawingUrl,
    });

    try {
      const descriptionPromptConfig = await promptService.getPrompt('USER_character_description');
      const generationPromptConfig = await promptService.getPrompt('USER_character_drawing');

      let detailedDescription = null;
      const MAX_RETRIES = 3;
      const RETRY_DELAY = 2000;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          console.log(`[ContentService] Passo 1, Tentativa ${attempt}/${MAX_RETRIES}: Obtendo descrição da imagem...`);
          const descriptionAttempt = await visionService.describeImage(publicImageUrl, descriptionPromptConfig.basePromptText);
          
          if (descriptionAttempt.toLowerCase().includes("i'm sorry") || descriptionAttempt.toLowerCase().includes("i cannot")) {
              throw new Error("A IA de visão recusou a análise nesta tentativa. Tentando novamente.");
          }
          
          detailedDescription = descriptionAttempt;
          console.log('[ContentService] Descrição válida obtida com sucesso.');
          break;

        } catch (error) {
          console.error(`[ContentService] Tentativa ${attempt} de obter descrição falhou: ${error.message}`);
          
          if (attempt === MAX_RETRIES) {
            console.error('[ContentService] Todas as tentativas de obter a descrição da imagem falharam.');
            throw new Error("A IA de visão não conseguiu processar a imagem após múltiplas tentativas. Por favor, tente uma imagem diferente.");
          }
          
          await sleep(RETRY_DELAY);
        }
      }
      
      await character.update({ description: `Nossa IA entendeu seu desenho como: "${detailedDescription}".` });

      console.log('[ContentService] Passo 2: Construindo e limpando o prompt...');
      
      const cleanedDescription = detailedDescription
        .replace(/Claro! Aqui estão os elementos visuais principais descritos como um conceito de personagem:/i, '')
        .replace(/\n/g, ' ') 
        .replace(/-/g, '')   
        .trim();             

      const finalPrompt = generationPromptConfig.basePromptText.replace('{{DESCRIPTION}}', cleanedDescription);
      
      console.log('[ContentService] Passo 3: Carregando imagem guia para Leonardo.Ai...');
      const leonardoInitImageId = await leonardoService.uploadImageToLeonardo(file.path, file.mimetype);

      console.log('[ContentService] Passo 4: Solicitando INÍCIO da geração ao Leonardo...');
      const generationId = await leonardoService.startImageGeneration(finalPrompt, leonardoInitImageId);
      
      await character.update({ generationJobId: generationId, name: "Gerando sua arte..." });

      console.log('[ContentService] Passo 5: Iniciando polling para o resultado...');
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
        throw new Error("A geração da imagem demorou muito para responder ou falhou no polling.");
      }
      console.log(`[ContentService] Polling bem-sucedido! URL da imagem final do Leonardo: ${finalImageUrl}`);

      console.log('[ContentService] Passo 6: Baixando imagem final para armazenamento local...');
      const localGeneratedUrl = await downloadAndSaveImage(finalImageUrl);

      console.log('[ContentService] Passo 7: Finalizando personagem no banco de dados...');
      await character.update({
        generatedCharacterUrl: localGeneratedUrl,
        name: 'Novo Personagem'
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
      return Character.findAll({ where: { userId }, order: [['createdAt', 'DESC']] });
  }
  
  async findBooksByUser(userId) {
      return Book.findAll({ 
        where: { authorId: userId }, 
        include: [
            { model: BookVariation, as: 'variations' }
        ],
        order: [['createdAt', 'DESC']] 
    });
  }

  async generateAndDownloadImage(prompt, generationType = 'illustration') {
    let generationId;
    if (generationType === 'coloring') {
      generationId = await leonardoService.startColoringPageGeneration(prompt);
    } else {
      generationId = await leonardoService.startStoryIllustrationGeneration(prompt);
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

    if (!finalImageUrl) {
        throw new Error(`A geração da imagem (${generationType}) demorou muito para responder.`);
    }

    return await downloadAndSaveImage(finalImageUrl, 'book-pages');
  }

  async createColoringBook(userId, { characterId }) {
    const character = await Character.findOne({ where: { id: characterId, userId } });
    if (!character) throw new Error('Personagem não encontrado ou não pertence ao usuário.');

    const themeTitlePromptConfig = await promptService.getPrompt('USER_book_theme_and_title');
    const storylinePromptConfig = await promptService.getPrompt('USER_coloring_storyline');
    const pageGenPromptConfig = await promptService.getPrompt('USER_coloring_page_generation');
    const coverGenPromptConfig = await promptService.getPrompt('USER_book_cover_generation');

    const characterImageUrl = `${process.env.APP_URL}${character.generatedCharacterUrl}`;
    let characterDescription = 'A cute and friendly character.';
    try {
        const descPrompt = await promptService.getPrompt('USER_character_description');
        const fetchedDescription = await visionService.describeImage(characterImageUrl, descPrompt.basePromptText);
        if (fetchedDescription && !fetchedDescription.toLowerCase().includes("i'm sorry")) {
            characterDescription = fetchedDescription.replace(/\n/g, ' ').replace(/-/g, '').trim();
        }
    } catch (descError) {
        console.warn(`[ContentService] AVISO: Falha ao obter descrição visual. Usando descrição padrão. Erro: ${descError.message}`);
    }

    const { theme, title } = await visionService.generateBookThemeAndTitle(characterDescription, themeTitlePromptConfig.basePromptText);
    const pageCount = 10;

    console.log(`[ContentService] Criando livro de colorir com TEMA: "${theme}", TÍTULO: "${title}"`);
    const book = await Book.create({
      authorId: userId, mainCharacterId: characterId, title, status: 'gerando', genre: theme,
    });
    const bookVariation = await BookVariation.create({
      bookId: book.id, type: 'colorir', format: 'digital_pdf', price: 0.00, coverUrl: character.generatedCharacterUrl, pageCount,
    });

    (async () => {
      try {
        console.log('[ContentService] Gerando capa para o livro de colorir...');
        const finalCoverPrompt = coverGenPromptConfig.basePromptText
            .replace('{{TITLE}}', title)
            .replace('{{CHARACTER_DESCRIPTION}}', characterDescription);
        const localCoverUrl = await this.generateAndDownloadImage(finalCoverPrompt, 'illustration');
        await bookVariation.update({ coverUrl: localCoverUrl });
        console.log(`[ContentService] Capa gerada e salva em: ${localCoverUrl}`);

        const sanitizedDescription = visionService.sanitizeDescriptionForColoring(characterDescription);
        
        console.log('[ContentService] Gerando roteiro para as páginas...');
        const pagePrompts = await visionService.generateColoringBookStoryline(character.name, sanitizedDescription, theme, pageCount, storylinePromptConfig.basePromptText);

        for (let i = 0; i < pagePrompts.length; i++) {
          const pageNumber = i + 1;
          const promptDePagina = pagePrompts[i];
          console.log(`[ContentService] Gerando página ${pageNumber}/${pageCount}: ${promptDePagina}`);

          const finalLeonardoPrompt = pageGenPromptConfig.basePromptText
            .replace('{{CHARACTER_DESCRIPTION}}', sanitizedDescription)
            .replace('{{PAGE_PROMPT}}', promptDePagina);
          
          const localPageUrl = await this.generateAndDownloadImage(finalLeonardoPrompt, 'coloring');

          await BookContentPage.create({
            bookVariationId: bookVariation.id, pageNumber, pageType: 'coloring_page', imageUrl: localPageUrl, illustrationPrompt: promptDePagina, status: 'completed'
          });
        }
        
        console.log('[ContentService] Todas as páginas foram geradas com sucesso!');
        await book.update({ status: 'privado' });

      } catch (error) {
        console.error(`[ContentService] Erro fatal na geração do livro de colorir ID ${book.id}:`, error.message);
        await book.update({ status: 'falha_geracao' });
      }
    })();

    return { message: "Seu livro de colorir começou a ser gerado!", book };
  }

  async createStoryBook(userId, { characterId, theme, summary }) {
    const character = await Character.findOne({ where: { id: characterId, userId } });
    if (!character) throw new Error('Personagem não encontrado ou não pertence ao usuário.');

    const title = theme; 

    const storylinePromptConfig = await promptService.getPrompt('USER_story_storyline');
    const illustrationGenPromptConfig = await promptService.getPrompt('USER_story_illustration_generation');
    const coverGenPromptConfig = await promptService.getPrompt('USER_book_cover_generation');

    const characterImageUrl = `${process.env.APP_URL}${character.generatedCharacterUrl}`;
    let characterDescription = 'A friendly and adventurous character.';
    try {
        const descPrompt = await promptService.getPrompt('USER_character_description');
        const fetchedDescription = await visionService.describeImage(characterImageUrl, descPrompt.basePromptText);
        if (fetchedDescription && !fetchedDescription.toLowerCase().includes("i'm sorry")) {
            characterDescription = fetchedDescription.replace(/\n/g, ' ').replace(/-/g, '').trim();
        }
    } catch (descError) {
        console.warn(`[ContentService] AVISO: Falha ao obter descrição visual. Usando descrição padrão. Erro: ${descError.message}`);
    }

    const pageCount = 20;
    const sceneCount = pageCount / 2;

    console.log(`[ContentService] Criando livro de HISTÓRIA com TEMA do usuário: "${theme}"`);
    const book = await Book.create({
      authorId: userId,
      mainCharacterId: characterId,
      title,
      status: 'gerando',
      genre: theme,
      storyPrompt: { theme, summary }
    });
    const bookVariation = await BookVariation.create({
      bookId: book.id, type: 'historia', format: 'digital_pdf', price: 0.00, coverUrl: character.generatedCharacterUrl, pageCount,
    });

    (async () => {
      try {
        console.log('[ContentService] Gerando capa para o livro de história...');
        const finalCoverPrompt = coverGenPromptConfig.basePromptText
            .replace('{{TITLE}}', title)
            .replace('{{CHARACTER_DESCRIPTION}}', characterDescription);
        const localCoverUrl = await this.generateAndDownloadImage(finalCoverPrompt, 'illustration');
        await bookVariation.update({ coverUrl: localCoverUrl });
        console.log(`[ContentService] Capa gerada e salva em: ${localCoverUrl}`);

        console.log('[ContentService] Gerando roteiro para o livro de história...');
        const storyPages = await visionService.generateStoryBookStoryline(
            character.name,
            characterDescription,
            theme,
            summary,
            sceneCount,
            storylinePromptConfig.basePromptText
        );

        let currentPageNumber = 1;
        for (const scene of storyPages) {
          console.log(`[ContentService] Gerando ILUSTRAÇÃO para a cena ${currentPageNumber}: ${scene.illustration_prompt}`);
          const finalIllustrationPrompt = illustrationGenPromptConfig.basePromptText.replace('{{ILLUSTRATION_PROMPT}}', scene.illustration_prompt);
          const localIllustrationUrl = await this.generateAndDownloadImage(finalIllustrationPrompt, 'illustration');
          
          await BookContentPage.create({
            bookVariationId: bookVariation.id, pageNumber: currentPageNumber, pageType: 'illustration', imageUrl: localIllustrationUrl, illustrationPrompt: scene.illustration_prompt, status: 'completed'
          });
          currentPageNumber++;
          
          console.log(`[ContentService] Gerando TEXTO para a cena ${currentPageNumber}: ${scene.page_text}`);
          await BookContentPage.create({
            bookVariationId: bookVariation.id, pageNumber: currentPageNumber, pageType: 'text', content: scene.page_text, status: 'completed'
          });
          currentPageNumber++;
        }
        
        console.log('[ContentService] Todas as páginas do livro de história foram geradas!');
        await book.update({ status: 'privado' });

      } catch (error) {
        console.error(`[ContentService] Erro fatal na geração do livro de história ID ${book.id}:`, error.message);
        await book.update({ status: 'falha_geracao' });
      }
    })();

    return { message: "Sua aventura começou a ser criada! Seu livro aparecerá em sua biblioteca em breve.", book };
  }

  async updateCharacterName(characterId, userId, name) {
    const character = await Character.findOne({ where: { id: characterId, userId } });
    if (!character) {
        throw new Error('Personagem não encontrado ou não pertence a você.');
    }
    await character.update({ name });
    console.log(`[ContentService] Personagem ID ${characterId} renomeado para "${name}".`);
    return character;
  }

  async getBookStatus(userId, bookId) {
    const book = await Book.findOne({
        where: { id: bookId, authorId: userId },
        attributes: ['id', 'status', 'title', 'finalPdfUrl'],
        include: [{
            model: BookVariation,
            as: 'variations',
            attributes: ['id', 'type', 'coverUrl', 'pageCount'],
            include: [{
                model: BookContentPage,
                as: 'pages',
                attributes: ['pageNumber', 'status', 'imageUrl']
            }]
        }]
    });
    if (!book) throw new Error('Livro não encontrado ou não pertence ao usuário.');
    return book;
  }
}

module.exports = new ContentService();