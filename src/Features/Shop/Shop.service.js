// src/Features/Shop/Shop.service.js

const { User, Character, Book, BookVariation, Category, AgeRating, Sequelize, sequelize } = require('../../models');
const popularityService = require('../Popularity/Popularity.service');

const JACKBOO_USER_ID = 1;

class ShopService {
  async listBooksForShop(shopType, filters = {}) {
    const { page = 1, limit = 9, categoryId, ageRatingId, sortBy = 'createdAt', order = 'DESC' } = filters;
    
    const whereClause = {
      status: 'publicado',
    };

    if (shopType === 'jackboo') {
      whereClause.authorId = JACKBOO_USER_ID;
    } else if (shopType === 'friends') {
      whereClause.authorId = { [Sequelize.Op.ne]: JACKBOO_USER_ID };
    }

    if (categoryId) whereClause.categoryId = categoryId;
    if (ageRatingId) whereClause.ageRatingId = ageRatingId;

    let orderClause = [[sortBy, order]];

    const { count, rows } = await Book.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'author', attributes: ['id', 'nickname', 'avatarUrl', 'slug'] },
        { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
        { model: AgeRating, as: 'ageRating', attributes: ['id', 'range'] },
        { 
          model: BookVariation, 
          as: 'variations',
          attributes: ['price', 'format', 'coverUrl'],
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

    const booksWithDetails = rows.map(book => {
      const bookJson = book.toJSON();
      return {
        ...bookJson,
        coverUrl: bookJson.variations[0]?.coverUrl,
        totalLikes: likesCounts[book.id] || 0,
      };
    });

    return { totalItems: count, books: booksWithDetails, totalPages: Math.ceil(count / limit), currentPage: parseInt(page, 10) };
  }
  
  async getBookDetails(bookId, userId = null) {
      const book = await Book.findOne({
          where: { id: bookId, status: 'publicado' },
          include: [
              { model: User, as: 'author', attributes: ['id', 'nickname', 'avatarUrl', 'isSystemUser', 'slug'] },
              { model: Character, as: 'mainCharacter', attributes: ['name', 'generatedCharacterUrl', 'description'] },
              { model: Category, as: 'category' },
              { model: AgeRating, as: 'ageRating' },
              { model: BookVariation, as: 'variations', include: [{ model: require('../../models').BookContentPage, as: 'pages' }] }
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
      whereClause.id = { [Sequelize.Op.ne]: excludeBookId };
    }

    const books = await Book.findAll({
      where: whereClause,
      include: [
        {
          model: BookVariation,
          as: 'variations',
          attributes: ['type', 'price', 'coverUrl'],
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
      // ✅ A LINHA 'group' FOI REMOVIDA DAQUI PARA CORRIGIR O ERRO 500
    });
    
    const formattedBooks = books.map(book => {
        const plainBook = book.toJSON();
        if (plainBook.variations && plainBook.variations.length > 0) {
            plainBook.variation = {
                price: parseFloat(plainBook.variations[0].price),
                format: plainBook.variations[0].format,
                type: plainBook.variations[0].type
            };
            plainBook.coverUrl = plainBook.variations[0].coverUrl;
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