const contentService = require('./Content.service');

class ContentController {

  async createCharacter(req, res) {
    try {
      const character = await contentService.createCharacter(req.user.id, req.body, req.file);
      res.status(201).json(character);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async getMyBooks(req, res) {
    try {
      // Este método agora lista livros em todos os status (incluindo 'gerando')
      const books = await contentService.findBooksByUser(req.user.id);
      res.status(200).json(books);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  // NOVO: Controller para criar livro de colorir
  async createColoringBook(req, res) {
    try {
      const book = await contentService.createColoringBook(req.user.id, req.body);
      res.status(202).json({ message: "Seu livro de colorir está sendo gerado! Ele aparecerá em sua biblioteca em breve.", book });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  // NOVO: Controller para criar livro de história
  async createStoryBook(req, res) {
    try {
      const book = await contentService.createStoryBook(req.user.id, req.body);
      res.status(202).json({ message: "Sua aventura está sendo criada! Seu livro aparecerá em sua biblioteca em breve.", book });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }


  async getMyCharacters(req, res) {
    try {
      const characters = await contentService.findCharactersByUser(req.user.id);
      res.status(200).json(characters);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async createBook(req, res) {
    try {
      const book = await contentService.createBook(req.user.id, req.body);
      res.status(201).json(book);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

   async deleteCharacter(req, res) {
        try {
            const { id } = req.params;
            await contentService.deleteCharacter(id, req.user.id);
            res.status(204).send();
        } catch (error) {
            res.status(404).json({ message: error.message });
        }
    }

    // --- Métodos para Royalties ---
    async getMyRoyalties(req, res) {
        try {
            const royalties = await contentService.findRoyaltiesByUser(req.user.id);
            res.status(200).json(royalties);
        } catch (error) {
            res.status(500).json({ message: 'Erro ao buscar seus royalties.', error: error.message });
        }
    }

    // NOVO: Controller para solicitar pagamento de royalties
    async requestPayout(req, res) {
      try {
        // Espera-se que o corpo da requisição contenha um array de IDs
        const { royaltyIds } = req.body;
        const result = await contentService.requestRoyaltyPayout(req.user.id, royaltyIds);
        res.status(200).json(result);
      } catch (error) {
        res.status(400).json({ message: error.message });
      }
    }

    // --- Métodos para Badges ---
    async getMyBadges(req, res) {
        try {
            const badges = await contentService.findBadgesByUser(req.user.id);
            res.status(200).json(badges);
        } catch (error) {
            res.status(500).json({ message: 'Erro ao buscar seus selos.', error: error.message });
        }
    }

    // NOVO: Controller para buscar histórico de pagamentos de assinatura
    async getMySubscriptionPayments(req, res) {
      try {
        const payments = await contentService.findSubscriptionPaymentHistoryByUser(req.user.id);
        res.status(200).json(payments);
      } catch (error) {
        res.status(500).json({ message: 'Erro ao buscar seu histórico de pagamentos.', error: error.message });
      }
    }
}


module.exports = new ContentController();