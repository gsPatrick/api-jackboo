const { Like, Book, Character, sequelize } = require('../../../models');

class PopularityService {
  /**
   * Adiciona ou remove um like de uma entidade (Livro ou Personagem).
   * @param {number} userId - ID do usuário dando/tirando o like.
   * @param {string} likableType - 'Book' ou 'Character'.
   * @param {number} likableId - ID do livro ou personagem.
   */
  async toggleLike(userId, likableType, likableId) {
    // 1. Verifica se a entidade existe
    let entity;
    if (likableType === 'Book') {
      entity = await Book.findByPk(likableId);
    } else if (likableType === 'Character') {
      entity = await Character.findByPk(likableId);
    } else {
      throw new Error('Tipo de entidade para curtir inválido.');
    }

    if (!entity) {
      throw new Error('Entidade não encontrada.');
    }

    // 2. Verifica se o like já existe
    const existingLike = await Like.findOne({
      where: { userId, likableType, likableId }
    });

    if (existingLike) {
      // Se existe, remove o like (toggle)
      await existingLike.destroy();
      return { message: 'Like removido.', liked: false };
    } else {
      // Se não existe, cria o like
      await Like.create({ userId, likableType, likableId });
      return { message: 'Like adicionado.', liked: true };
    }
  }

  /**
   * Retorna a contagem de likes para uma entidade específica.
   * @param {string} likableType - 'Book' ou 'Character'.
   * @param {number} likableId - ID da entidade.
   */
  async getLikesCount(likableType, likableId) {
    const count = await Like.count({
      where: { likableType, likableId }
    });
    return count;
  }

  /**
   * Verifica se um usuário já deu like em uma entidade.
   * @param {number} userId - ID do usuário.
   * @param {string} likableType - 'Book' ou 'Character'.
   * @param {number} likableId - ID da entidade.
   */
  async userLiked(userId, likableType, likableId) {
    const liked = await Like.findOne({
      where: { userId, likableType, likableId }
    });
    return !!liked; // Retorna true ou false
  }

  /**
   * Pega a contagem de likes para múltiplos livros/personagens para listagens.
   * Retorna um mapa { id: count }
   * @param {string} likableType - 'Book' ou 'Character'.
   * @param {Array<number>} likableIds - Array de IDs das entidades.
   */
  async getCountsForMultipleEntities(likableType, likableIds) {
    if (!likableIds || likableIds.length === 0) {
      return {};
    }

    const counts = await Like.findAll({
      attributes: [
        'likableId',
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalLikes']
      ],
      where: {
        likableType,
        likableId: { [sequelize.Op.in]: likableIds }
      },
      group: ['likableId']
    });

    return counts.reduce((acc, current) => {
      acc[current.likableId] = current.dataValues.totalLikes;
      return acc;
    }, {});
  }
}

module.exports = new PopularityService();