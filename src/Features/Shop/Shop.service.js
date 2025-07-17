// src/Features/Shop/Shop.service.js

const { User, Character, Book, BookVariation, Category, AgeRating, sequelize } = require('../../models');
const { Op } = require('sequelize');
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
      whereClause.authorId = { [Op.ne]: JACKBOO_USER_ID };
    }

    if (categoryId) whereClause.categoryId = categoryId;
    if (ageRatingId) whereClause.ageRatingId = ageRatingId;

    let orderClause = [[sortBy, order]];

    const { count, rows } = await Book.findAndCountAll({
      where: whereClause,
      include: [
        // --- CORREÇÃO AQUI ---
        // Removido 'slug' da lista de atributos
        { model: User, as: 'author', attributes: ['id', 'nickname', 'avatarUrl'] },
        // --- FIM DA CORREÇÃO ---
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
              // --- CORREÇÃO AQUI ---
              // Removido 'slug' da lista de atributos
              { model: User, as: 'author', attributes: ['id', 'nickname', 'avatarUrl', 'isSystemUser'] },
              // --- FIM DA CORREÇÃO ---
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

  // O restante do arquivo (findRelatedBooks) não parece estar pedindo o slug, então deve estar ok.
  // ... (o resto do seu arquivo)
   async findRelatedBooks({ authorId, bookType, excludeBookId, limit = 5 }) {
    if (!authorId || !bookType) {
      throw new Error('authorId e bookType são parâmetros obrigatórios.');
    }

    const whereClause = {
      authorId,
      status: 'publicado',
    };
    
    if (excludeBookId) {
      whereClause.id = { [Op.ne]: excludeBookId }; // Not Equal
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