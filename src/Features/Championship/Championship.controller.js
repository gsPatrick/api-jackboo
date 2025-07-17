const championshipService = require('./Championship.service');
const { getClientIp } = require('../../Utils/ipHelper'); // Utilidade para pegar o IP

class ChampionshipController {
  /**
   * GET /api/championships/current - Obtém informações do campeonato atual
   */
  async getCurrentChampionship(req, res) {
    try {
      const championship = await championshipService.findCurrentActiveChampionship();
      res.status(200).json(championship);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }

  /**
   * POST /api/championships/submit - Envia um desenho para o campeonato.
   * Requer autenticação e upload de arquivo.
   */
  async submitDrawing(req, res) {
    try {
      const userId = req.user.id; // Vem do middleware isAuthenticated
      const submission = await championshipService.submitDrawing(userId, req.body, req.file);
      res.status(201).json(submission);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * GET /api/championships/:championshipId/submissions - Lista as submissões aprovadas.
   */
  async listPublicSubmissions(req, res) {
    try {
      const { championshipId } = req.params;
      const submissions = await championshipService.listPublicSubmissions(championshipId, req.query);
      res.status(200).json(submissions);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * POST /api/championships/submissions/:submissionId/vote - Registra ou remove um voto.
   * Pode ser feito por usuário autenticado ou IP.
   */
  async toggleVote(req, res) {
    try {
      const { submissionId } = req.params;
      const userId = req.user ? req.user.id : null; // Se estiver autenticado
      const voterIp = getClientIp(req); // Pega o IP do cliente
      
      if (!userId && !voterIp) { // Proteção extra, embora o modelo já lide com isso
          return res.status(400).json({ message: 'Não foi possível identificar o votante (usuário ou IP).' });
      }

      const result = await championshipService.toggleVote(submissionId, userId, voterIp);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  /**
   * GET /api/championships/submissions/:submissionId/vote-status - Obtém a contagem de votos e o status do voto do usuário.
   */
  async getSubmissionVoteStatus(req, res) {
    try {
      const { submissionId } = req.params;
      const userId = req.user ? req.user.id : null;
      const voterIp = getClientIp(req);

      const status = await championshipService.getSubmissionVoteStatus(submissionId, userId, voterIp);
      res.status(200).json(status);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
}

module.exports = new ChampionshipController();
