const { User, Character, Book, BookVariation, Setting, Royalty, Order, OrderItem, Badge, UserBadge, Championship, Subscription, SubscriptionPayment } = require('../../../models');
const popularityService = require('../Popularity/Popularity.service');
const imageGenerationService = require('../../OpenAI/services/imageGeneration.service');
const { Op } = require('sequelize');
const BookCreationService = require('./BookCreation.service'); // O serviço que processa em segundo plano

const MIN_ROYALTY_PAYOUT = 50.00;

class ContentService {
  async createCharacter(userId, characterData, file) {
      const { name, description, traits } = characterData;
      const user = await User.findByPk(userId);

      if (user.role === 'user') {
        const existingCharacterCount = await Character.count({ where: { userId } });
        const limitSetting = await Setting.findByPk('free_character_limit');
        const freeCharacterLimit = limitSetting ? parseInt(limitSetting.value, 10) : 1;

        if (existingCharacterCount >= freeCharacterLimit) {
          throw new Error(`Limite de ${freeCharacterLimit} personagem(ns) gratuito(s) atingido. Assine para criar mais.`);
        }
      }
      
      if (!file) {
        throw new Error('Nenhum arquivo de imagem enviado para o desenho original.');
      }
      const originalDrawingUrl = `/uploads/user-drawings/${file.filename}`; // Usar o novo subdiretório

      const character = await Character.create({
        userId,
        name,
        description,
        traits: traits || {},
        originalDrawingUrl,
        generatedCharacterUrl: null,
      });

      try {
        const generatedCharacterUrl = await imageGenerationService.generateCharacterImage(character, userId);
        await character.update({ generatedCharacterUrl });
      } catch (aiError) {
        console.error(`Erro ao gerar imagem IA para personagem ${character.id}:`, aiError.message);
        character.generatedCharacterUrl = originalDrawingUrl;
        await character.update({ generatedCharacterUrl: originalDrawingUrl });
      }

      return character;
    }


     async createColoringBook(userId, bookData) {
    const { title, mainCharacterId } = bookData;
    if (!title || !mainCharacterId) {
      throw new Error("Título e Personagem Principal são obrigatórios.");
    }

    // 1. Encontrar o template padrão de livro de colorir
    const template = await BookTemplate.findOne({ where: { systemType: 'USER_COLORING_BOOK' } });
    if (!template) {
      throw new Error("O template para criação de livro de colorir não está configurado. Contate o suporte.");
    }

    // 2. Criar a entrada do livro no banco
    const book = await Book.create({
      authorId: userId,
      mainCharacterId,
      title,
      bookTemplateId: template.id,
      status: 'gerando', // Novo status para indicar processamento
      // Preencher outros campos padrões se necessário
      weight: 0.1, length: 21, width: 21, height: 0.5, // Padrões
    });

    // 3. Disparar a geração das páginas em segundo plano
    await BookCreationService.startBookGeneration(book, {}); // Sem inputs de usuário
    
    return book;
  }

  /**
   * Cria um Livro de História para o usuário, usando o template padrão e seus inputs.
   * @param {number} userId - ID do usuário.
   * @param {object} bookData - { title, mainCharacterId, userInputs: { lugar, tema } }
   */
  async createStoryBook(userId, bookData) {
    const { title, mainCharacterId, userInputs } = bookData;
    if (!title || !mainCharacterId || !userInputs || !userInputs.lugar || !userInputs.tema) {
      throw new Error("Título, Personagem Principal, Lugar e Tema são obrigatórios.");
    }

    // 1. Encontrar o template padrão de livro de história
    const template = await BookTemplate.findOne({ where: { systemType: 'USER_STORY_BOOK' } });
    if (!template) {
      throw new Error("O template para criação de livro de história não está configurado. Contate o suporte.");
    }
    
    // 2. Criar a entrada do livro no banco
    const book = await Book.create({
      authorId: userId,
      mainCharacterId,
      title,
      bookTemplateId: template.id,
      status: 'gerando',
      genre: userInputs.tema, // Podemos usar o tema como gênero
      storyPrompt: userInputs, // Salva os inputs do usuário
      weight: 0.2, length: 21, width: 21, height: 1, // Padrões
    });

    // 3. Disparar a geração das páginas em segundo plano
    await BookCreationService.startBookGeneration(book, userInputs);
    
    return book;
  }
  

    async findCharactersByUser(userId) {
        const characters = await Character.findAll({
            where: { userId },
            order: [['createdAt', 'DESC']],
        });

        const characterIds = characters.map(char => char.id);
        const likesCounts = await popularityService.getCountsForMultipleEntities('Character', characterIds);

        const charactersWithLikes = characters.map(char => ({
            ...char.toJSON(),
            totalLikes: likesCounts[char.id] || 0,
        }));

        return charactersWithLikes;
    }
  
  async findCharacterById(id, userId) {
    const character = await Character.findOne({ where: { id, userId } });
    if (!character) throw new Error('Personagem não encontrado ou não pertence a este usuário.');
    return character;
  }


  async createBook(userId, bookData) {
    const { mainCharacterId, title, genre, storyPrompt, variations } = bookData;

    const mainCharacter = await this.findCharacterById(mainCharacterId, userId);

    const newBook = await Book.create({
      authorId: userId,
      mainCharacterId,
      title,
      genre,
      storyPrompt,
      status: 'privado',
    });

    if (variations && variations.length > 0) {
      const createdVariations = [];
      for (const v of variations) {
        let generatedContent = {};
        let generatedCoverUrl = v.coverUrl || '/images/default-cover.png';
        
        try {
          if (v.type === 'colorir') {
            const coloringPageUrl = await imageGenerationService.generateColoringBookPage(
              newBook,
              // Exemplo de contexto, o frontend precisaria enviar isso para cada página
              `A página de colorir para o livro ${newBook.title} com o personagem ${mainCharacter.name}.`,
              userId
            );
            generatedContent = { type: 'single_image_pdf', imageUrl: coloringPageUrl };
          } else if (v.type === 'historia') {
            const illustrationUrl = await imageGenerationService.generateStoryBookIllustration(
              newBook,
              // Exemplo de contexto, o frontend precisaria enviar isso para cada ilustração de capítulo
              `A ilustração principal para o livro ${newBook.title} com ${mainCharacter.name}.`,
              userId
            );
            generatedContent = { type: 'single_illustration', imageUrl: illustrationUrl };
          }
        } catch (aiError) {
          console.error(`Erro ao gerar conteúdo IA para variação ${v.type} do livro ${newBook.id}:`, aiError.message);
          generatedContent = { error: aiError.message, fallback: true };
        }

        const newVariation = await BookVariation.create({
          bookId: newBook.id,
          type: v.type,
          format: v.format,
          price: v.price,
          description: v.description,
          coverUrl: generatedCoverUrl,
          contentJson: generatedContent,
          pageCount: v.pageCount || (v.type === 'colorir' ? 1 : null),
          bgColor: v.bgColor || null,
          isAvailable: v.isAvailable !== undefined ? v.isAvailable : true,
          weight: v.weight || 0.1,
          length: v.length || 10,
          width: v.width || 10,
          height: v.height || 1,
        });
        createdVariations.push(newVariation);
      }
    }
    
    return Book.findByPk(newBook.id, { include: ['variations', 'mainCharacter'] });
  }

  async findBooksByUser(userId) {
    const books = await Book.findAll({
      where: { authorId: userId },
      include: ['mainCharacter', 'variations'],
      order: [['createdAt', 'DESC']],
    });

    const bookIds = books.map(book => book.id);
    const likesCounts = await popularityService.getCountsForMultipleEntities('Book', bookIds);

    const booksWithLikes = books.map(book => ({
        ...book.toJSON(),
        totalLikes: likesCounts[book.id] || 0,
    }));

    return booksWithLikes;
  }

   async deleteCharacter(characterId, userId) {
    const character = await Character.findOne({ where: { id: characterId, userId } });
    
    if (!character) {
        throw new Error('Personagem não encontrado ou não pertence a este usuário.');
    }

    // TODO: Lógica para apagar o arquivo de imagem ORIGINAL do storage (S3, etc.)
    // TODO: Lógica para apagar a imagem GERADA PELA IA e o LOG associado
    
    await character.destroy();
    return { message: 'Personagem deletado com sucesso. Você pode criar um novo no lugar.' };
  }

  // --- Lógica de Royalties para o Usuário ---
  async findRoyaltiesByUser(userId) {
    return Royalty.findAll({
      where: { authorId: userId },
      include: [
        {
          model: OrderItem,
          as: 'sourceSale',
          include: [{
            model: BookVariation,
            as: 'variation',
            attributes: ['type', 'format', 'description', 'coverUrl'],
            include: [{
                model: Book,
                as: 'book',
                attributes: ['id', 'title'],
            }]
          }]
        },
      ],
      order: [['createdAt', 'DESC']]
    });
  }

  async requestRoyaltyPayout(userId, royaltyIds) {
    if (!Array.isArray(royaltyIds) || royaltyIds.length === 0) {
      throw new Error('IDs dos royalties a serem solicitados são obrigatórios.');
    }

    const royalties = await Royalty.findAll({
      where: {
        id: { [Op.in]: royaltyIds },
        authorId: userId,
        status: 'pending'
      }
    });

    if (royalties.length !== royaltyIds.length) {
      throw new Error('Um ou mais royalties não foram encontrados ou não estão pendentes para este usuário.');
    }

    const totalAmount = royalties.reduce((sum, r) => sum + parseFloat(r.commissionAmount), 0);
    if (totalAmount < MIN_ROYALTY_PAYOUT) {
      throw new Error(`O valor total mínimo para solicitação de pagamento é de R$${MIN_ROYALTY_PAYOUT.toFixed(2)}. Valor solicitado: R$${totalAmount.toFixed(2)}.`);
    }

    await sequelize.transaction(async (t) => {
      for (const royalty of royalties) {
        await royalty.update({ status: 'requested_payout', requestDate: new Date() }, { transaction: t });
      }
    });

    return { message: `${royalties.length} royalties marcados como 'solicitado pagamento'. Total: R$${totalAmount.toFixed(2)}.` };
  }

  // --- Lógica de Badges para o Usuário ---
  async findBadgesByUser(userId) {
    return UserBadge.findAll({
      where: { userId: userId },
      include: [
        {
          model: Badge,
          as: 'badge',
          attributes: ['id', 'name', 'type', 'imageUrl', 'description'],
          include: [{
            model: Championship,
            as: 'championship',
            attributes: ['id', 'name', 'startDate', 'endDate'],
          }]
        },
        {
            model: Submission,
            as: 'submission',
            attributes: ['id', 'childName', 'drawingUrl'],
        }
      ],
      order: [['awardDate', 'DESC']]
    });
  }

  // --- Lógica de Histórico de Pagamentos de Assinatura para o Usuário ---
  async findSubscriptionPaymentHistoryByUser(userId) {
    const subscription = await Subscription.findOne({ where: { userId } });
    if (!subscription) {
      return [];
    }
    return SubscriptionPayment.findAll({
      where: { subscriptionId: subscription.id },
      order: [['paymentDate', 'DESC']],
      include: [{
          model: Subscription,
          as: 'subscription',
          attributes: ['id', 'status'],
          include: [{
              model: Plan,
              as: 'plan',
              attributes: ['name', 'price', 'frequency']
          }]
      }]
    });
  }
}

module.exports = new ContentService();