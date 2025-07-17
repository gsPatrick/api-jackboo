const adminChampionshipsService = require('./AdminChampionships.service');

class AdminChampionshipsController {
  // --- CRUD de Campeonatos ---
  async listAll(req, res) {
    try {
      const result = await adminChampionshipsService.listAllChampionships(req.query);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao listar campeonatos.', error: error.message });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const championship = await adminChampionshipsService.findChampionshipById(id);
      res.status(200).json(championship);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }

  async create(req, res) {
    try {
      const championship = await adminChampionshipsService.createChampionship(req.body);
      res.status(201).json(championship);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const championship = await adminChampionshipsService.updateChampionship(id, req.body);
      res.status(200).json(championship);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      const result = await adminChampionshipsService.deleteChampionship(id);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  // --- Moderação de Submissões ---
  async listSubmissionsForModeration(req, res) {
    try {
      const result = await adminChampionshipsService.listSubmissionsForModeration(req.query);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao listar submissões para moderação.', error: error.message });
    }
  }

  async approveSubmission(req, res) {
    try {
      const { id } = req.params;
      const submission = await adminChampionshipsService.approveSubmission(id);
      res.status(200).json(submission);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async rejectSubmission(req, res) {
    try {
      const { id } = req.params;
      const submission = await adminChampionshipsService.rejectSubmission(id);
      res.status(200).json(submission);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  // --- Funções de Cálculo/Gerenciamento de Campeonato ---
  async calculateAvailablePrizes(req, res) {
    try {
      const { championshipId } = req.params;
      const championship = await adminChampionshipsService.calculateAvailablePrizes(championshipId);
      res.status(200).json({ message: 'Prêmios disponíveis atualizados.', championship });
    } catch (error) {
      res.status(500).json({ message: 'Erro ao calcular prêmios disponíveis.', error: error.message });
    }
  }

  async calculateFinalScores(req, res) {
    try {
      const { championshipId } = req.params;
      const result = await adminChampionshipsService.calculateFinalScores(championshipId);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao calcular pontuações finais.', error: error.message });
    }
  }

  async determineWinners(req, res) {
    try {
      const { championshipId } = req.params;
      const result = await adminChampionshipsService.determineWinners(championshipId);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao determinar vencedores.', error: error.message });
    }
  }
}

module.exports = new AdminChampionshipsController();
