const { Royalty, User, OrderItem, BookVariation, Book } = require('../../../models');
const { Op } = require('sequelize');

class AdminRoyaltiesService {
  /**
   * Lista todos os royalties, com filtros de status e autor, e paginação.
   * @param {object} filters - status, authorId, page, limit.
   */
  async listRoyalties(filters = {}) {
    const { page = 1, limit = 10, status, authorId } = filters;
    const whereClause = {};

    if (status) whereClause.status = status;
    if (authorId) whereClause.authorId = authorId;

    const { count, rows } = await Royalty.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'author', attributes: ['id', 'nickname', 'email'] },
        {
          model: OrderItem,
          as: 'sourceSale',
          include: [{
            model: BookVariation,
            as: 'variation',
            attributes: ['type', 'format', 'description'],
            include: [{
                model: Book,
                as: 'book',
                attributes: ['title'],
            }]
          }]
        },
      ],
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      order: [['createdAt', 'ASC']], // Mais antigos primeiro para payout
    });

    return { totalItems: count, royalties: rows, totalPages: Math.ceil(count / limit), currentPage: parseInt(page, 10) };
  }

  /**
   * Marca um ou mais royalties como pagos.
   * @param {Array<number>} royaltyIds - IDs dos royalties a serem marcados como pagos.
   * @returns {object} Mensagem de sucesso e contagem de atualizações.
   */
  async markRoyaltiesAsPaid(royaltyIds) {
    if (!Array.isArray(royaltyIds) || royaltyIds.length === 0) {
      throw new Error('IDs dos royalties são obrigatórios.');
    }

    const updatedCount = await Royalty.update(
      { status: 'paid_out', paymentDate: new Date() },
      {
        where: {
          id: { [Op.in]: royaltyIds },
          status: 'pending', // Apenas royalties pendentes podem ser pagos
        }
      }
    );

    return { message: `${updatedCount[0]} royalties marcados como pagos.`, count: updatedCount[0] };
  }

  /**
   * Calcula o total pendente de royalties para um autor.
   * @param {number} authorId - ID do autor.
   * @returns {number} O valor total pendente.
   */
  async getPendingRoyaltiesTotal(authorId) {
    const total = await Royalty.sum('commissionAmount', {
      where: { authorId, status: 'pending' }
    });
    return total || 0;
  }
}

module.exports = new AdminRoyaltiesService();
