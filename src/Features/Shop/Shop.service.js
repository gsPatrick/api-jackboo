// src/Features/Shop/Shop.service.js

// A importação agora funciona como esperado, pois 'index.js' gerencia as dependências.
const { User, Book, BookVariation, Category, AgeRating, sequelize, Op } = require('../../../models');
const popularityService = require('../Popularity/Popularity.service'); // Importar o serviço de popularidade
console.log('[DEBUG Shop.service.js] Modelos importados. O modelo "Book" está definido aqui?', !!Book);

const JACKBOO_USER_ID = 1; // ID do usuário sistema "JackBoo Oficial"

class ShopService {
  /**
   * Lista livros para uma vitrine específica (JackBoo ou Amigos).
   * Retorna apenas livros com status 'publicado'.
   * @param {string} shopType - 'jackboo' ou 'friends'.
   * @param {object} filters - Opções de filtro (page, limit, categoryId, etc.).
   */
  async listBooksForShop(shopType, filters = {}) {
    const { page = 1, limit = 9, categoryId, ageRatingId, sortBy = 'createdAt', order = 'DESC' } = filters;
    
    const whereClause = {
      status: 'publicado',
    };

    if (shopType === 'jackboo') {
      whereClause.authorId = JACKBOO_USER_ID;
    } else if (shopType === 'friends') {
      whereClause.authorId = { [Op.ne]: JACKBOO_USER_ID };
    }

    if (categoryId) whereClause.categoryId = categoryId;
    if (ageRatingId) whereClause.ageRatingId = ageRatingId;

    let orderClause = [[sortBy, order]];

    // Esta chamada agora funcionará porque 'Book' não será mais undefined.
    const { count, rows } = await Book.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'author', attributes: ['id', 'nickname', 'avatarUrl'] },
        { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
        { model: AgeRating, as: 'ageRating', attributes: ['id', 'range'] },
        { 
          model: BookVariation, 
          as: 'variations',
          attributes: ['price', 'format', 'coverUrl'], // Adicionado coverUrl para o frontend
          limit: 1,
          order: [['price', 'ASC']]
        },
      ],
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      order: orderClause,
      distinct: true,
      subQuery: false,
    });

    const bookIds = rows.map(book => book.id);
    const likesCounts = await popularityService.getCountsForMultipleEntities('Book', bookIds);

    const booksWithLikes = rows.map(book => {
        const plainBook = book.toJSON();
        // Adiciona a coverUrl principal para facilitar o acesso no frontend
        plainBook.coverUrl = plainBook.variations[0]?.coverUrl || null;

        return {
          ...plainBook,
          totalLikes: likesCounts[book.id] || 0,
        };
    });

    return { totalItems: count, books: booksWithLikes, totalPages: Math.ceil(count / limit), currentPage: parseInt(page, 10) };
  }
  
  /**
   * Busca os detalhes públicos de um único livro para a página de detalhes do produto.
   * @param {number} bookId - O ID do livro.
   * @param {number} [userId=null] - O ID do usuário logado (opcional, para verificar se ele curtiu).
   */
  async getBookDetails(bookId, userId = null) {
      const book = await Book.findOne({
          where: { id: bookId, status: 'publicado' },
          include: [
              { model: User, as: 'author', attributes: ['id', 'nickname', 'avatarUrl', 'isSystemUser'] },
              { model: Character, as: 'mainCharacter', attributes: ['name', 'generatedCharacterUrl', 'description'] },
              { model: Category, as: 'category' },
              { model: AgeRating, as: 'ageRating' },
              { model: BookVariation, as: 'variations' }
          ]
      });

      if (!book) {
          throw new Error('Livro não encontrado ou não está disponível para venda.');
      }

      const bookData = book.toJSON();
      bookData.totalLikes = await popularityService.getLikesCount('Book', bookId);
      if (userId) {
          bookData.userLiked = await popularityService.userLiked(userId, 'Book', bookId);
      } else {
          bookData.userLiked = false;
      }

      return bookData;
  }

   async findRelatedBooks({ authorId, bookType, excludeBookId, limit = 5 }) {
    if (!authorId || !bookType) {
      throw new Error('authorId e bookType são parâmetros obrigatórios.');
    }

    const whereClause = {
      authorId,
      status: 'publicado',
    };

    if (excludeBookId) {
      whereClause.id = { [Op.ne]: excludeBookId };
    }

    const books = await Book.findAll({
      where: whereClause,
      include: [
        {
          model: BookVariation,
          as: 'variations',
          attributes: ['type', 'price', 'format'],
          where: { type: bookType },
          required: true, 
        },
        {
          model: User,
          as: 'author',
          attributes: ['nickname']
        }
      ],
      limit: parseInt(limit, 10),
      order: [['createdAt', 'DESC']],
      group: ['Book.id', 'author.id', 'variations.id'], 
    });
    
    const formattedBooks = books.map(book => {
        const plainBook = book.toJSON();
        if (plainBook.variations && plainBook.variations.length > 0) {
            plainBook.variation = {
                price: parseFloat(plainBook.variations[0].price),
                format: plainBook.variations[0].format,
                type: plainBook.variations[0].type
            };
            delete plainBook.variations;
        }
        return plainBook;
    });

    const relatedBookIds = formattedBooks.map(book => book.id);
    const relatedLikesCounts = await popularityService.getCountsForMultipleEntities('Book', relatedBookIds);

    const booksWithLikes = formattedBooks.map(book => ({
      ...book,
      totalLikes: relatedLikesCounts[book.id] || 0,
    }));

    return booksWithLikes;
  }
}

module.exports = new ShopService();