const shopService = require('./Shop.service');

class ShopController {
  async getJackbooShelf(req, res) {
    try {
      const result = await shopService.listBooksForShop('jackboo', req.query);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao buscar livros da Lojinha JackBoo.', error: error.message });
    }
  }

  async getFriendsShelf(req, res) {
    try {
      const result = await shopService.listBooksForShop('friends', req.query);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao buscar livros da Lojinha dos Amigos.', error: error.message });
    }
  }
  
  async getBookDetails(req, res) {
      try {
          const { id } = req.params;
          // NOVO: Passa req.user.id se disponível (isAuthenticated middleware popula req.user)
          // Mesmo em rotas públicas, se um token JWT válido for enviado, o req.user estará populado.
          const userId = req.user ? req.user.id : null; 
          const book = await shopService.getBookDetails(id, userId); // Passa o userId
          res.status(200).json(book);
      } catch (error) {
          res.status(404).json({ message: error.message });
      }
  }
  async getRelatedBooks(req, res) {
    try {
      const { authorId, bookType, excludeBookId } = req.query;

      // Validação básica dos parâmetros obrigatórios
      if (!authorId || !bookType) {
        return res.status(400).json({ message: 'Os parâmetros "authorId" e "bookType" são obrigatórios.' });
      }

      const books = await shopService.findRelatedBooks({
        authorId: parseInt(authorId, 10),
        bookType,
        excludeBookId: excludeBookId ? parseInt(excludeBookId, 10) : null,
      });

      res.status(200).json(books);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao buscar livros relacionados.', error: error.message });
    }
  }
}

module.exports = new ShopController();