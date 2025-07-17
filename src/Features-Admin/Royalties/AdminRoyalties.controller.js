const adminRoyaltiesService = require('./AdminRoyalties.service');

class AdminRoyaltiesController {
  async listRoyalties(req, res) {
    try {
      const result = await adminRoyaltiesService.listRoyalties(req.query);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao listar royalties.', error: error.message });
    }
  }

  async markAsPaid(req, res) {
    try {
      const { royaltyIds } = req.body; // Espera um array de IDs
      const result = await adminRoyaltiesService.markRoyaltiesAsPaid(royaltyIds);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async getPendingTotal(req, res) {
    try {
      const { authorId } = req.params; // Pode ser passado na rota ou query
      const total = await adminRoyaltiesService.getPendingRoyaltiesTotal(parseInt(authorId, 10));
      res.status(200).json({ totalPending: total });
    } catch (error) {
      res.status(500).json({ message: 'Erro ao buscar total de royalties pendentes.', error: error.message });
    }
  }
}

module.exports = new AdminRoyaltiesController();
