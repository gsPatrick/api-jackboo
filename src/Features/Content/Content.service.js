// src/Features/Content/Content.service.js

const { Character, Book, BookVariation, BookContentPage, sequelize, User } = require('../../models');
const visionService = require('../../OpenAI/services/openai.service');
const leonardoService = require('../../OpenAI/services/leonardo.service');
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

// ✅ NOVO: Lista completa de temas para seleção aleatória
const coloringBookThemes = [
    "Praia com castelo de areia", "Piquenique no parque", "Passeio de bicicleta", "Viagem de trem", "Aeroporto e malas de viagem", "Nadando na piscina", "Acampamento com barraca", "Cabaninha na floresta", "Passeio de barco", "Zoológico", "Museu de ciências", "Feira de diversões", "Parquinho com escorregador", "Montanha-russa", "Caminhada na montanha", "Pesca no lago", "Fazendinha de visita", "Carrossel", "Zoológico aquático", "Observando fogos de artifício",
    "Praia tropical", "Sorveteria", "Correndo em aspersor de água", "Piquenique ao sol", "Piscina inflável no quintal", "Mercado de frutas", "Vendedor de picolé", "Comendo melancia", "Chapéu de sol na varanda", "Jardim florido", "Festa na piscina", "Soltando pipa", "Cães brincando com mangueira d’água", "Bexigas de água", "Feira de verão", "Jogando vôlei de praia", "Barquinho de papel no riacho", "Família no parque", "Brincando de amarelinha", "Bicicleta com cestinha de flores",
    "Neve na cidade", "Montando boneco de neve", "Patinação no gelo", "Trenó na montanha", "Com cachecol e luvas", "Esquiadores", "Casa com lareira acesa", "Bebendo chocolate quente", "Pinguins brincando na neve", "Roupas no varal de inverno", "Floresta com neve", "Coelhos na neve", "Neve caindo sobre telhados", "Guerra de bolas de neve", "Esquilo guardando comida", "Raposa na neve", "Bonecos de neve engraçados", "Ursinho polar pescando no gelo", "Trenó puxado por cachorros", "Olhando vitrines natalinas",
    "No balanço", "Escorregador", "Passeio de pedalinho no lago", "Roda-gigante pequena", "Gangorra", "Corrida de saco", "Piquenique no gramado", "Soltando bolhas de sabão", "Pista de skate", "Cachorrinho correndo no parque", "Jogando bola", "Carrossel de madeira", "Caminho com flores", "Alimentando patos no lago", "Bicicletas com rodinhas", "Lendo livro debaixo da árvore", "Brincando de esconde-esconde", "Carrinho de pipoca", "Voando pipa", "Festa de aniversário no parque",
    "Acampamento na floresta", "Animais espiando das árvores", "Riacho entre pedras", "Coruja em galho", "Raposa brincando", "Explorando com lanterna", "Cabaninha de galhos", "Piquenique na clareira", "Ursinho pescando no lago", "Coelhos na toca", "Caça ao tesouro na floresta", "Colhendo frutas", "Ponte de madeira sobre rio", "Árvore com balanço improvisado", "Borboletas voando", "Trilha com mochilas", "Macaquinho pulando", "Pássaros cantando", "Olhando mapa de trilha", "Escalada em árvore",
    "Com telescópio", "Nave espacial", "Planetas sorridentes", "Astronauta fofo", "Lua com bandeira", "Galáxia estrelada", "Em foguete", "Base lunar", "Alienígena amigo", "Estação espacial", "Robô no espaço", "Flutuando no espaço", "Viagem a Saturno", "Ônibus espacial", "Exploração de Marte", "Segurando uma estrela", "Cometa sorridente", "Plutão com cachecol", "Dentro da nave olhando pela janela", "Festa espacial",
    "Sala de aula", "Pintando na escola", "Biblioteca escolar", "Refeitório da escola", "Recreio", "Jogando bola na quadra", "Professora contando história", "Quadro negro com desenhos", "Aula de música", "Aula de ciências", "Festa junina na escola", "Feira de ciências", "Excursão escolar", "No ônibus escolar", "Escrevendo no caderno", "Aula de matemática", "No teatro da escola", "Armários escolares", "Trocando figurinhas", "Indo embora da escola",
    "Padaria", "Praça com coreto", "Mercado de frutas", "Ponto de ônibus", "Loja de brinquedos", "Farmácia", "Feira de rua", "Cinema", "Atravessando faixa de pedestre", "Parquinho na praça", "Cabeleireiro", "Loja de roupas", "Sorveteria", "Bicicletário", "Cafeteria", "Correios", "Bancos na praça", "Passeando com cachorro", "Carros na rua", "Camelô de rua",
    "Galinheiro", "Alimentando patos", "Cavalo no estábulo", "Colheita de milho", "Pomar de maçã", "Ordenhando vaca", "Carroça de feno", "Colhendo ovos", "Porquinhos brincando", "Celeiro cheio", "Festa da colheita", "Plantação de girassol", "Cavalgando", "Espantalho", "Trator", "Horta comunitária", "Coelho no quintal", "Regando plantação", "Comendo maçã da árvore", "Cachorro cuidando do gado",
    "Aniversário com bolo", "Festa junina", "Natal com árvore", "Abertura de presentes", "Fantasiados no Halloween", "Caça aos ovos de Páscoa", "Carnaval com confete", "Fogos de Ano Novo", "Festa do pijama", "Com chapéu de festa", "Festa na piscina", "Festa no quintal", "Amigo secreto", "Fazendo artesanato", "Balões coloridos", "Corrida de sacos em festa", "Dança de quadrilha", "Festa da escola", "Festa de fantasia", "Festa de despedida de verão",
    "Médico no consultório", "Bombeiro apagando incêndio", "Policial dirigindo viatura", "Professor dando aula", "Cozinheiro em uma cozinha", "Pintor com cavalete", "Cantor com microfone", "Dançarino no palco", "Arquiteto com planta na mão", "Cientista em laboratório", "Fotógrafo com câmera antiga", "Agricultor colhendo verduras", "Carteiro entregando cartas", "Piloto dentro do avião", "Marinheiro no navio", "Astronauta explorando a lua", "Mecânico consertando carro", "Veterinário cuidando de cachorro", "Escritor digitando em máquina de escrever", "Juiz no tribunal com martelo",
    "Corredores na pista de atletismo", "Nadadores em piscina olímpica", "Jogadores de basquete", "Judocas em combate", "Futebol em campo olímpico", "Saltador com vara", "Jogadores de vôlei de praia", "Ginasta com fita", "Arqueiro mirando no alvo", "Jogadores de tênis", "Maratonistas cruzando linha de chegada", "Ciclistas em prova de estrada", "Halterofilista levantando peso", "Esgrimistas duelando", "Ginasta nas argolas", "Saltador em trampolim", "Jogadores de hóquei na grama", "Boxeadores no ringue", "Skate nas olimpíadas urbanas", "Cerimônia de medalhas com pódio",
    "Cristo Redentor no Rio de Janeiro", "Coliseu de Roma", "Torre Eiffel em Paris", "Estátua da Liberdade em Nova York", "Pirâmides do Egito", "Taj Mahal na Índia", "Grande Muralha da China", "Chichén Itzá no México", "Torre de Pisa na Itália", "Big Ben em Londres", "Machu Picchu no Peru", "Petra na Jordânia", "Moai da Ilha de Páscoa", "Ópera de Sydney", "Castelo de Neuschwanstein na Alemanha", "Monte Rushmore nos EUA", "Estátua da Mãe Pátria em Moscou", "Catedral de Notre-Dame em Paris", "Palácio de Versalhes", "Estátua do Buda Gigante em Hong Kong",
    "Tiranossauro Rex rugindo", "Tricerátopo pastando", "Estegossauro com placas nas costas", "Pterodátilo voando", "Diplodoco comendo folhas", "Velociraptor correndo", "Exploradores com fósseis", "Ovo de dinossauro quebrando", "Cena de erupção vulcânica", "Dinossauro bebendo água em lago", "Mamute lanudo (era pré-histórica)", "Cena de floresta jurássica", "Dinossauro com ninho de ovos", "Esqueleto em museu", "Cena de luta entre dinossauros", "Dinossauro marinho (plesiossauro)", "Dinossauro herbívoro em bando", "Paleontólogos escavando", "Pegadas gigantes no chão", "Dinossauro dormindo na caverna",
    "Soltando pipa no verão", "Tomando sorvete", "Guarda-sóis na praia", "Piscina com boias", "Comendo melancia no calor", "Jardim florido na primavera", "Regando flores", "Borboletas voando em um campo", "Festa de primavera", "Colhendo frutas no pomar", "Folhas caindo no outono", "Brincando em pilhas de folhas secas", "Colheita de abóboras", "Paisagem com árvores alaranjadas", "Montando boneco de neve no inverno", "Patinação no gelo", "Guerra de bolas de neve", "Bebendo chocolate quente na lareira", "Ursinho polar brincando na neve", "Trenó puxado por cachorros",
    "Resgatando um gatinho em uma árvore", "Apagando um incêndio", "Voando sobre a cidade", "Herói aquático salvando peixinhos", "Herói da floresta protegendo animais", "Impedindo a queda de um meteoro", "Criando uma barreira de energia mágica", "Ajudando a atravessar uma ponte", "Levantando um carro para salvar alguém", "Afastando uma tempestade com poderes de vento", "Iluminando uma caverna escura", "Defendendo a Terra de cometas", "Salvando filhotes em uma enchente", "Segurando pedras que caem de uma montanha", "Ajudando a arrumar brinquedos", "Voando com foguete nas costas", "Parando um trem em emergência", "Construindo uma barragem para salvar uma aldeia", "Guiando animais perdidos de volta para a floresta", "Ajudando pessoas idosas a atravessar a rua",
    "Dirigindo um carro colorido", "Pilotando uma moto com capacete", "Andando de bicicleta", "Dirigindo um ônibus escolar", "Conduzindo um caminhão de carga", "Em um trem com vagões", "Dentro de um metrô", "Como capitão em um barco a vela", "Navegando em um navio", "Em um submarino no fundo do mar", "Pilotando um avião", "Dentro de um helicóptero", "Viajando em um balão de ar quente", "Dirigindo um trator", "Em um quadriciclo de aventura", "Pilotando um patinete elétrico", "Em um táxi amarelo", "Em um bonde elétrico", "Andando em um skate", "Em um hoverboard futurista"
];

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

  async createBook(creationData) {
    const {
      authorId,
      characterIds,
      bookType,
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

  async _generateColoringBookPagesGemini(book, variation, characters, theme, pageCount) {
    const mainCharacter = characters[0];
    
    console.log('[ContentService] Carregando imagens de referência para o livro de colorir...');
    const coverBaseImage = await loadReferenceImage('src/assets/ai-references/cover/cover_base.jpg');
    
    const userCharacterPath = path.join(__dirname, '../../../', mainCharacter.generatedCharacterUrl.substring(1));
    const userCharacterImage = { 
        imageData: await fs.readFile(userCharacterPath), 
        mimeType: `image/${path.extname(userCharacterPath).slice(1)}` 
    };
    
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

  async createColoringBook(userId, { characterIds, theme }) {
    const selectedTheme = theme || coloringBookThemes[Math.floor(Math.random() * coloringBookThemes.length)];
    
    console.log(`[ContentService] Tema para livro de colorir selecionado: "${selectedTheme}"`);

    return this.createBook({
      authorId: userId,
      characterIds,
      bookType: 'colorir',
      theme: selectedTheme,
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