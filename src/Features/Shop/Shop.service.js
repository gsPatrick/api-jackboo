const { User, Character, Book, BookVariation, Category, AgeRating, sequelize } = require('../../../models');
const { Op } = require('sequelize');
const popularityService = require('../Popularity/Popularity.service'); // Importar o serviço de popularidade

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
      status: 'publicado', // Apenas livros publicados são listados
    };

    // Define o autor com base no tipo da loja
    if (shopType === 'jackboo') {
      whereClause.authorId = JACKBOO_USER_ID;
    } else if (shopType === 'friends') {
      whereClause.authorId = { [Op.ne]: JACKBOO_USER_ID }; // 'ne' = Not Equal
    }

    // Aplica filtros de taxonomia se fornecidos
    if (categoryId) whereClause.categoryId = categoryId;
    if (ageRatingId) whereClause.ageRatingId = ageRatingId;

    // Define a ordenação
    let orderClause = [[sortBy, order]];
    // Adicionar ordenação por popularidade (ex: número de likes) seria um bom próximo passo
    // if (sortBy === 'popularity') {
    //   orderClause = [[sequelize.fn('COUNT', sequelize.col('likes.id')), 'DESC']];
    // }

    const { count, rows } = await Book.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'author', attributes: ['id', 'nickname', 'avatarUrl'] },
        // Não precisamos de 'mainCharacter' na listagem da loja para economizar dados
        { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
        { model: AgeRating, as: 'ageRating', attributes: ['id', 'range'] },
        // Incluímos apenas a primeira variação para exibir o preço "a partir de"
        { 
          model: BookVariation, 
          as: 'variations',
          attributes: ['price', 'format'],
          limit: 1,
          order: [['price', 'ASC']]
        },
      ],
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      order: orderClause,
      distinct: true,
      subQuery: false, // Importante para ordenação e contagem corretas com includes
    });

    // NOVO: Adicionar contagem de likes para cada livro
    const bookIds = rows.map(book => book.id);
    const likesCounts = await popularityService.getCountsForMultipleEntities('Book', bookIds);

    const booksWithLikes = rows.map(book => ({
      ...book.toJSON(), // Converte para JSON para fácil manipulação
      totalLikes: likesCounts[book.id] || 0, // Adiciona totalLikes
    }));


    return { totalItems: count, books: booksWithLikes, totalPages: Math.ceil(count / limit), currentPage: parseInt(page, 10) };
  }
  
  /**
   * Busca os detalhes públicos de um único livro para a página de detalhes do produto.
   * @param {number} bookId - O ID do livro.
   * @param {number} [userId=null] - O ID do usuário logado (opcional, para verificar se ele curtiu).
   */
  async getBookDetails(bookId, userId = null) { // userId agora é opcional
      const book = await Book.findOne({
          where: { id: bookId, status: 'publicado' },
          include: [
              { model: User, as: 'author', attributes: ['id', 'nickname', 'avatarUrl', 'isSystemUser'] },
              { model: Character, as: 'mainCharacter', attributes: ['name', 'generatedCharacterUrl', 'description'] },
              { model: Category, as: 'category' },
              { model: AgeRating, as: 'ageRating' },
              // Traz TODAS as variações para o cliente poder escolher (físico, digital, etc.)
              { model: BookVariation, as: 'variations' }
          ]
      });

      if (!book) {
          throw new Error('Livro não encontrado ou não está disponível para venda.');
      }

      // NOVO: Adicionar contagem de likes e status de "curtido pelo usuário"
      const bookData = book.toJSON(); // Converte para JSON para adicionar propriedades
      bookData.totalLikes = await popularityService.getLikesCount('Book', bookId);
      if (userId) { // Verifica se userId foi fornecido
          bookData.userLiked = await popularityService.userLiked(userId, 'Book', bookId);
      } else {
          bookData.userLiked = false; // Se não houver usuário, não está curtido
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

    // Adiciona a condição para excluir o livro atual, se um ID for fornecido
    if (excludeBookId) {
      whereClause.id = { [Op.ne]: excludeBookId }; // Not Equal
    }

    const books = await Book.findAll({
      where: whereClause,
      // Incluímos a associação com BookVariation para poder filtrar por tipo
      include: [
        {
          model: BookVariation,
          as: 'variations',
          attributes: ['type', 'price'],
          where: { type: bookType }, // Filtra para que o livro TENHA uma variação do tipo desejado
          required: true, // Garante que apenas livros com essa variação sejam retornados
        },
        {
          model: User,
          as: 'author',
          attributes: ['nickname']
        }
      ],
      limit: parseInt(limit, 10),
      order: [['createdAt', 'DESC']], // Pega os mais recentes
      // Agrupamento para evitar resultados duplicados quando um livro tem múltiplas variações do mesmo tipo
      group: ['Book.id', 'author.id', 'variations.id'], 
    });
    
    // O findAll retorna um objeto complexo, precisamos formatá-lo para ser mais simples
    // e pegar apenas os dados do livro principal com sua primeira variação.
    const formattedBooks = books.map(book => {
        const plainBook = book.toJSON();
        // Simplifica o retorno para conter a primeira variação encontrada
        if (plainBook.variations && plainBook.variations.length > 0) {
            // Assume que 'price' é um campo numérico aqui ou converta se for string no BD
            plainBook.variation = {
                price: parseFloat(plainBook.variations[0].price),
                format: plainBook.variations[0].format,
                type: plainBook.variations[0].type
            };
            delete plainBook.variations; // Remove o array para limpar a resposta
        }
        return plainBook;
    });

    // NOVO: Adicionar contagem de likes para cada livro relacionado
    const relatedBookIds = formattedBooks.map(book => book.id);
    const relatedLikesCounts = await popularityService.getCountsForMultipleEntities('Book', relatedBookIds);

    const booksWithLikes = formattedBooks.map(book => ({
      ...book, // Já é um objeto JSON formatado
      totalLikes: relatedLikesCounts[book.id] || 0, // Adiciona totalLikes
    }));

    return booksWithLikes;
  }
}

module.exports = new ShopService();