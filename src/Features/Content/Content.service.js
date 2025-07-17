
// src/Features/Content/Content.service.js
const { User, Character, Book, BookVariation, Setting, Royalty, OrderItem, Badge, UserBadge, Submission, SubscriptionPayment, sequelize } = require('../../models');
const popularityService = require('../Popularity/Popularity.service');
const { Op } = require('sequelize');

// --- AQUI ESTÁ A MUDANÇA PRINCIPAL ---
// 1. Importamos a função específica do nosso novo gerador.
const { generateCharacter } = require('../../Generators/characterGenerator');
// ------------------------------------

const MIN_ROYALTY_PAYOUT = 50.00;

class ContentService {
  
  // --- MÉTODO ATUALIZADO ---
  // 2. O método createCharacter agora é extremamente simples.
  // Ele recebe apenas o userId e o arquivo, e delega 100% da lógica
  // para a função `generateCharacter` que importamos.
  // Isso corrige o erro "generateCharacter is not defined".
  async createCharacter(userId, file) {
      return generateCharacter(userId, file);
  }
  // -------------------------

  // A lógica de criação de livros também será simplificada da mesma forma no futuro.
  // Por enquanto, o restante do arquivo permanece como está.

  async createColoringBook(userId, bookData) {
    // ... (Lógica antiga a ser refatorada no futuro)
    throw new Error("Função createColoringBook ainda não foi refatorada para o novo sistema de geradores.");
  }

  async createStoryBook(userId, bookData) {
    // ... (Lógica antiga a ser refatorada no futuro)
    throw new Error("Função createStoryBook ainda não foi refatorada para o novo sistema de geradores.");
  }
  
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
    // ...código existente...
  }
}

module.exports = new ContentService();