
const contentService = require('./Content.service');

class ContentController {

  async createCharacter(req, res, next) { // Adicionado 'next' para tratamento de erro
    try {
      // --- LOG DE DEPURAÇÃO CRÍTICO ---
      console.log("[Controller] Chegou em createCharacter.");
      console.log("[Controller] req.file:", req.file);
      console.log("[Controller] req.body:", req.body);
      // ---------------------------------

      if (!req.file) {
        // Se depois de todas as correções o req.file ainda for undefined,
        // lançamos um erro claro aqui.
        throw new Error("O servidor não recebeu o arquivo. Verifique a configuração do middleware de upload.");
      }

      const character = await contentService.createCharacter(req.user.id, req.file);
      res.status(201).json(character);
    } catch (error) {
      // Passa o erro para o middleware de tratamento de erro do app.js
      next(error);
    }
  }

  async getMyBooks(req, res, next) {
    try {
      const books = await contentService.findBooksByUser(req.user.id);
      res.status(200).json(books);
    } catch (error) {
      next(error);
    }
  }

  async createColoringBook(req, res, next) {
    try {
      const book = await contentService.createColoringBook(req.user.id, req.body);
      res.status(202).json({ message: "Seu livro de colorir está sendo gerado! Ele aparecerá em sua biblioteca em breve.", book });
    } catch (error) {
      next(error);
    }
  }

  async createStoryBook(req, res, next) {
    try {
      const book = await contentService.createStoryBook(req.user.id, req.body);
      res.status(202).json({ message: "Sua aventura está sendo criada! Seu livro aparecerá em sua biblioteca em breve.", book });
    } catch (error) {
      next(error);
    }
  }

  async getMyCharacters(req, res, next) {
    try {
      const characters = await contentService.findCharactersByUser(req.user.id);
      res.status(200).json(characters);
    } catch (error) {
      next(error);
    }
  }

  async deleteCharacter(req, res, next) {
        try {
            const { id } = req.params;
            await contentService.deleteCharacter(id, req.user.id);
            res.status(204).send();
        } catch (error) {
            next(error);
        }
    }

  async getMyRoyalties(req, res, next) {
        try {
            const royalties = await contentService.findRoyaltiesByUser(req.user.id);
            res.status(200).json(royalties);
        } catch (error) {
            next(error);
        }
    }

  async requestPayout(req, res, next) {
      try {
        const { royaltyIds } = req.body;
        const result = await contentService.requestRoyaltyPayout(req.user.id, royaltyIds);
        res.status(200).json(result);
      } catch (error) {
        next(error);
      }
    }

  async getMyBadges(req, res, next) {
        try {
            const badges = await contentService.findBadgesByUser(req.user.id);
            res.status(200).json(badges);
        } catch (error) {
            next(error);
        }
    }

  async getMySubscriptionPayments(req, res, next) {
      try {
        const payments = await contentService.findSubscriptionPaymentHistoryByUser(req.user.id);
        res.status(200).json(payments);
      } catch (error) {
        next(error);
      }
    }
}

module.exports = new ContentController();