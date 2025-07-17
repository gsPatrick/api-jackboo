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

  async getMyBooks(req, res) {
    try {
      const books = await contentService.findBooksByUser(req.user.id);
      res.status(200).json(books);
    } catch (error) {
      res.status(500).json({ message: error.message });
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

  async requestPayout(req, res) { // Implementação do método que faltava
    try {
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

  // --- Métodos para Histórico de Pagamentos de Assinatura ---
  async getMySubscriptionPayments(req, res) { // Implementação do método que faltava
    try {
      const payments = await contentService.findSubscriptionPaymentHistoryByUser(req.user.id);
      res.status(200).json(payments);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao buscar histórico de pagamentos de assinatura.', error: error.message });
    }
  }
}

module.exports = new ContentController();