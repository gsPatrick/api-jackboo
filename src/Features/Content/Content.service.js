// src/Features/Content/Content.service.js
const { User, Character, Book, BookVariation, Setting, Royalty, OrderItem, Badge, UserBadge, Submission, SubscriptionPayment, sequelize } = require('../../models');
// REMOVIDO: A importação de BookTemplate não é mais necessária.

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
      const originalDrawingUrl = `/uploads/user-drawings/${file.filename}`;

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
        await character.update({ generatedCharacterUrl: originalDrawingUrl });
      }

      return character;
  }

  // --- MÉTODOS DE CRIAÇÃO DE LIVRO ATUALIZADOS ---

  async createColoringBook(userId, bookData) {
    const { title, mainCharacterId } = bookData;
    if (!title || !mainCharacterId) {
      throw new Error("Título e Personagem Principal são obrigatórios.");
    }

    // ALTERADO: A lógica de buscar um template no banco foi removida.
    // A criação do livro é direta.
    const book = await Book.create({
      authorId: userId,
      mainCharacterId,
      title,
      status: 'gerando',
      weight: 0.1, length: 21, width: 21, height: 0.5,
      // Usamos storyPrompt para indicar o tipo de livro internamente para o gerador.
      storyPrompt: { bookType: 'coloring' } 
    });

    // Dispara a geração em segundo plano. O userInputs é vazio para livros de colorir.
    await BookCreationService.startBookGeneration(book.id, {});
    
    return book;
  }

  async createStoryBook(userId, bookData) {
    const { title, mainCharacterId, userInputs } = bookData;
    if (!title || !mainCharacterId || !userInputs || !userInputs.lugar || !userInputs.tema) {
      throw new Error("Título, Personagem Principal, Lugar e Tema são obrigatórios.");
    }
    
    // ALTERADO: A lógica de buscar um template no banco foi removida.
    const book = await Book.create({
      authorId: userId,
      mainCharacterId,
      title,
      status: 'gerando',
      genre: userInputs.tema, 
      storyPrompt: { ...userInputs, bookType: 'story' }, // Adiciona o tipo de livro
      weight: 0.2, length: 21, width: 21, height: 1,
    });

    // Dispara a geração com os inputs fornecidos pelo usuário.
    await BookCreationService.startBookGeneration(book.id, userInputs);
    
    return book;
  }
  
  // --- FIM DOS MÉTODOS ATUALIZADOS ---

  async findCharactersByUser(userId) {
      const characters = await Character.findAll({
          where: { userId },
          order: [['createdAt', 'DESC']],
      });

      const characterIds = characters.map(char => char.id);
      const likesCounts = await popularityService.getCountsForMultipleEntities('Character', characterIds);

      return characters.map(char => ({
          ...char.toJSON(),
          totalLikes: likesCounts[char.id] || 0,
      }));
  }
  
  async findCharacterById(id, userId) {
    const character = await Character.findOne({ where: { id, userId } });
    if (!character) throw new Error('Personagem não encontrado ou não pertence a este usuário.');
    return character;
  }

  async findBooksByUser(userId) {
    const books = await Book.findAll({
      where: { authorId: userId },
      include: ['mainCharacter', 'variations'],
      order: [['createdAt', 'DESC']],
    });

    const bookIds = books.map(book => book.id);
    const likesCounts = await popularityService.getCountsForMultipleEntities('Book', bookIds);

    return books.map(book => ({
        ...book.toJSON(),
        totalLikes: likesCounts[book.id] || 0,
    }));
  }

  async deleteCharacter(characterId, userId) {
    const character = await Character.findOne({ where: { id: characterId, userId } });
    
    if (!character) {
        throw new Error('Personagem não encontrado ou não pertence a este usuário.');
    }
    
    await character.destroy(); // Hooks no model deletarão os arquivos
    return { message: 'Personagem deletado com sucesso. Você pode criar um novo no lugar.' };
  }

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
            include: [{ model: Book, as: 'book', attributes: ['id', 'title'] }]
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
      await Royalty.update(
          { status: 'requested_payout', requestDate: new Date() },
          { where: { id: { [Op.in]: royaltyIds } }, transaction: t }
      );
    });

    return { message: `${royalties.length} royalties marcados como 'solicitado pagamento'. Total: R$${totalAmount.toFixed(2)}.` };
  }

  async findBadgesByUser(userId) {
    return UserBadge.findAll({
      where: { userId: userId },
      include: [
        {
          model: Badge,
          as: 'badge',
          include: [{ model: Championship, as: 'championship' }]
        },
        { model: Submission, as: 'submission' }
      ],
      order: [['awardDate', 'DESC']]
    });
  }

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
          include: [{
              model: Plan,
              as: 'plan',
          }]
      }]
    });
  }
}

module.exports = new ContentService();