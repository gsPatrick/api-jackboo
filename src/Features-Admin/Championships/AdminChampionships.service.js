    const { Championship, Submission, User, Vote, Order, OrderItem, BookVariation, Book, Badge, UserBadge, sequelize } = require('../../models');
const { Op } = require('sequelize');
const { startOfMonth, endOfMonth, format } = require('date-fns');
const { ptBR } = require('date-fns/locale'); // Importar o locale para formatar datas em português

// Constantes para o cálculo de prêmios e URLs de imagem de selo
const BOOKS_PER_PRIZE = 20;
const NUMBER_OF_FINALISTS_PER_GROUP = 1; // Quantos finalistas são selecionados por grupo (além do vencedor)
const DEFAULT_WINNER_BADGE_IMAGE = '/images/badges/winner_badge.png';
const DEFAULT_FINALIST_BADGE_IMAGE = '/images/badges/finalist_badge.png';


class AdminChampionshipsService {
  /**
   * Lista todos os campeonatos, com filtros e paginação.
   */
  async listAllChampionships(filters = {}) {
    const { page = 1, limit = 10, status, name } = filters;
    const whereClause = {};

    if (status) whereClause.status = status;
    if (name) whereClause.name = { [Op.iLike]: `%${name}%` };

    const { count, rows } = await Championship.findAndCountAll({
      where: whereClause,
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      order: [['startDate', 'DESC']],
    });

    return { totalItems: count, championships: rows, totalPages: Math.ceil(count / limit), currentPage: parseInt(page, 10) };
  }

  /**
   * Busca um campeonato por ID.
   */
  async findChampionshipById(id) {
    const championship = await Championship.findByPk(id);
    if (!championship) throw new Error('Campeonato não encontrado.');
    return championship;
  }

  /**
   * Cria um novo campeonato.
   */
  async createChampionship(data) {
    // Validar datas (startDate deve ser anterior a endDate)
    if (new Date(data.startDate) >= new Date(data.endDate)) {
        throw new Error('A data de início deve ser anterior à data de término.');
    }
    return Championship.create(data);
  }

  /**
   * Atualiza um campeonato existente.
   */
  async updateChampionship(id, data) {
    const championship = await this.findChampionshipById(id);
    if (data.startDate && data.endDate && new Date(data.startDate) >= new Date(data.endDate)) {
        throw new Error('A data de início deve ser anterior à data de término.');
    }
    return championship.update(data);
  }

  /**
   * Deleta um campeonato.
   * TODO: Implementar verificação se há submissões ou prêmios associados antes de deletar.
   */
  async deleteChampionship(id) {
    const championship = await this.findChampionshipById(id);
    const submissionsCount = await Submission.count({ where: { championshipId: id } });
    if (submissionsCount > 0) {
        throw new Error(`Não é possível deletar este campeonato, pois ele possui ${submissionsCount} submissões.`);
    }
    // TODO: Considerar deletar badges associadas a este campeonato também, se não houver outros usos.
    await championship.destroy();
    return { message: 'Campeonato deletado com sucesso.' };
  }

  /**
   * Lista todas as submissões (pendentes, aprovadas, rejeitadas) para moderação.
   */
  async listSubmissionsForModeration(filters = {}) {
    const { page = 1, limit = 10, status, championshipId, ageGroup } = filters;
    const whereClause = {};

    if (status) whereClause.status = status;
    if (championshipId) whereClause.championshipId = championshipId;
    if (ageGroup) whereClause.ageGroup = ageGroup;

    const { count, rows } = await Submission.findAndCountAll({
      where: whereClause,
      include: [
        { model: Championship, as: 'championship', attributes: ['id', 'name'] },
        { model: User, as: 'submitter', attributes: ['id', 'nickname'] },
      ],
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      order: [['createdAt', 'DESC']],
    });
    return { totalItems: count, submissions: rows, totalPages: Math.ceil(count / limit), currentPage: parseInt(page, 10) };
  }

  /**
   * Aprova uma submissão.
   */
  async approveSubmission(submissionId) {
    const submission = await Submission.findByPk(submissionId);
    if (!submission) throw new Error('Submissão não encontrada.');
    if (submission.status !== 'pending_approval') {
      throw new Error('A submissão já foi processada.');
    }
    await submission.update({ status: 'approved' });
    return submission;
  }

  /**
   * Rejeita uma submissão.
   */
  async rejectSubmission(submissionId) {
    const submission = await Submission.findByPk(submissionId);
    if (!submission) throw new Error('Submissão não encontrada.');
    if (submission.status !== 'pending_approval') {
      throw new Error('A submissão já foi processada.');
    }
    await submission.update({ status: 'rejected' });
    // TODO: Lógica para deletar o arquivo de drawingUrl do storage.
    return submission;
  }

  /**
   * Calcula e atualiza o número de prêmios disponíveis para um campeonato.
   * Esta função pode ser chamada manualmente ou por um CRON job.
   * @param {number} championshipId - ID do campeonato.
   */
  async calculateAvailablePrizes(championshipId) {
    const championship = await this.findChampionshipById(championshipId);

    const totalSales = await OrderItem.sum('quantity', {
        include: [{
            model: Order,
            as: 'order',
            where: {
                paymentStatus: 'paid',
                createdAt: {
                    [Op.gte]: championship.startDate,
                    [Op.lte]: championship.endDate
                }
            },
            required: true,
        },
        {
            model: BookVariation,
            as: 'variation',
            where: {
                format: { [Op.in]: ['physical', 'digital_pdf'] }
            },
            required: true,
        }
        ]
    });

    const prizes = Math.floor(totalSales / BOOKS_PER_PRIZE);
    await championship.update({ availablePrizes: prizes });
    return championship;
  }

  /**
   * NOVO: Algoritmo de Pontuação Final Automatizado.
   * Calcula a pontuação final para todas as submissões aprovadas de um campeonato.
   * Critérios: Total de curtidas únicas (usuários logados e IPs únicos).
   * @param {number} championshipId - ID do campeonato.
   */
  async calculateFinalScores(championshipId) {
    console.log(`Iniciando cálculo de pontuações finais para o campeonato ${championshipId}...`);
    const submissions = await Submission.findAll({
      where: { championshipId, status: 'approved' }
    });

    for (const submission of submissions) {
      // 1. Contagem de votos de usuários logados (únicos por userId)
      const uniqueUserVotes = await Vote.count({
        where: { submissionId: submission.id, userId: { [Op.not]: null } },
        distinct: true,
        col: 'userId'
      });

      // 2. Contagem de votos anônimos (únicos por voterIp)
      const uniqueIpVotes = await Vote.count({
        where: { submissionId: submission.id, voterIp: { [Op.not]: null } },
        distinct: true,
        col: 'voterIp'
      });

      // ALGORITMO DE PONTUAÇÃO FINAL
      // O regulamento: "Total de curtidas únicas (máximo 50% do peso)"
      // e "Diversidade de engajamento (votos de diferentes IPs ou regiões)".
      // Simplificação: Votos de usuários autenticados têm peso maior, e o total de IPs únicos
      // contribui para a "diversidade". O "50% do peso" significa que outros critérios (não implementados,
      // como análise visual ou tempo de visualização) poderiam compor os outros 50%.
      // Ajuste os pesos conforme sua lógica de negócio.
      const USER_VOTE_WEIGHT = 2; // Voto de usuário logado tem mais peso
      const IP_VOTE_WEIGHT = 1;   // Voto por IP (anônimo ou não)

      const score = (uniqueUserVotes * USER_VOTE_WEIGHT) + (uniqueIpVotes * IP_VOTE_WEIGHT);

      await submission.update({ finalScore: score });
      console.log(`Submissão ${submission.id} (Criança: ${submission.childName}) - Score: ${score} (Usuários: ${uniqueUserVotes}, IPs: ${uniqueIpVotes})`);
    }
    return { message: `Pontuações finais calculadas para o campeonato ${championshipId}.` };
  }

  /**
   * NOVO: Determina os vencedores e finalistas de um campeonato, e concede os selos (badges).
   * @param {number} championshipId - ID do campeonato.
   */
  async determineWinners(championshipId) {
    const championship = await this.findChampionshipById(championshipId);
    if (!championship || championship.status !== 'closed') {
      throw new Error('O campeonato não está no status "closed" para determinar os vencedores.');
    }

    console.log(`Determinando vencedores para o campeonato ${championship.name} (ID: ${championshipId})...`);

    await sequelize.transaction(async (t) => { // Inicia uma transação para a determinação de vencedores
        // 1. Garantir que todas as pontuações foram calculadas
        await this.calculateFinalScores(championshipId);

        // 2. Coleta todas as submissões aprovadas com pontuação final, ordenadas
        const allSubmissions = await Submission.findAll({
            where: { championshipId, status: 'approved', finalScore: { [Op.not]: null } },
            order: [['finalScore', 'DESC'], ['createdAt', 'ASC']], // Maior score primeiro, depois mais antigo (desempate)
            include: [{ model: User, as: 'submitter' }],
            transaction: t,
        });

        if (allSubmissions.length === 0) {
            console.log(`Nenhuma submissão aprovada para o campeonato ${championshipId}.`);
            await championship.update({ status: 'finished' }, { transaction: t });
            return { message: 'Nenhuma submissão aprovada para determinar vencedores.', winners: [], finalists: [] };
        }

        const winners = [];
        const finalists = [];
        let prizesDistributed = 0;
        const ageGroups = ['3-5', '6-8', '9-11', '12+'];

        // Agrupa submissões por faixa etária para distribuição de prêmios por grupo
        const submissionsByAgeGroup = ageGroups.reduce((acc, group) => {
            acc[group] = allSubmissions.filter(s => s.ageGroup === group);
            return acc;
        }, {});

        // Distribui um vencedor por faixa etária primeiro, se houver prêmios
        for (const group of ageGroups) {
            if (prizesDistributed >= championship.availablePrizes) break;
            if (submissionsByAgeGroup[group].length > 0) {
                const groupWinner = submissionsByAgeGroup[group][0];
                if (!winners.some(w => w.id === groupWinner.id)) { // Evita duplicidade se já foi selecionado por algum motivo
                    winners.push(groupWinner);
                    prizesDistributed++;
                    await groupWinner.update({ isWinner: true }, { transaction: t });
                    await this._awardBadgeToUser(groupWinner.userId, 'winner', championship, groupWinner, t);
                    console.log(`Vencedor (${group}): ${groupWinner.childName} (Submissão ID: ${groupWinner.id}) - Score: ${groupWinner.finalScore}`);
                }
            }
        }

        // Se ainda houver prêmios, distribua para os próximos melhores no geral (independentemente do grupo)
        for (let i = 0; i < allSubmissions.length && prizesDistributed < championship.availablePrizes; i++) {
            const submission = allSubmissions[i];
            if (!winners.some(w => w.id === submission.id)) {
                winners.push(submission);
                prizesDistributed++;
                await submission.update({ isWinner: true }, { transaction: t });
                await this._awardBadgeToUser(submission.userId, 'winner', championship, submission, t);
                console.log(`Vencedor Extra: ${submission.childName} (Submissão ID: ${submission.id}) - Score: ${submission.finalScore}`);
            }
        }

        // Identificar finalistas (os próximos X melhores por grupo, excluindo os vencedores)
        for (const group of ageGroups) {
            const potentialFinalistsInGroup = submissionsByAgeGroup[group].filter(s => !winners.some(w => w.id === s.id));
            for (let i = 0; i < potentialFinalistsInGroup.length && i < NUMBER_OF_FINALISTS_PER_GROUP; i++) {
                const submission = potentialFinalistsInGroup[i];
                if (!finalists.some(f => f.id === submission.id)) { // Evita duplicidade
                    finalists.push(submission);
                    await submission.update({ isFinalist: true }, { transaction: t });
                    await this._awardBadgeToUser(submission.userId, 'finalist', championship, submission, t);
                    console.log(`Finalista (${group}): ${submission.childName} (Submissão ID: ${submission.id}) - Score: ${submission.finalScore}`);
                }
            }
        }

        // 3. Atualiza o status do campeonato para 'finished'
        await championship.update({ status: 'finished' }, { transaction: t });

        console.log(`Determinação de vencedores finalizada para o campeonato ${championshipId}.`);
        return { message: `Vencedores do campeonato ${championshipId} determinados.`, winners, finalists };
    }); // Fim da transação
  }

  /**
   * Método auxiliar para conceder um selo a um usuário.
   * Se o selo específico do campeonato não existir, ele é criado.
   * @param {number} userId - ID do usuário que receberá o selo.
   * @param {string} badgeType - Tipo do selo ('winner', 'finalist').
   * @param {Championship} championship - Objeto do campeonato.
   * @param {Submission} [submission] - Objeto da submissão que gerou o selo (opcional).
   * @param {object} [transaction] - Transação Sequelize ativa (opcional).
   */
  async _awardBadgeToUser(userId, badgeType, championship, submission = null, transaction = null) {
    const monthYear = format(championship.startDate, 'MMMM/yyyy', { locale: ptBR });
    let badgeNamePrefix;
    let imageUrl;
    let description;

    if (badgeType === 'winner') {
      badgeNamePrefix = `Campeão`;
      imageUrl = DEFAULT_WINNER_BADGE_IMAGE;
      description = `Vencedor do Campeonato JackBoo de ${format(championship.startDate, 'MMMM de yyyy', { locale: ptBR })} com o desenho "${submission ? submission.childName : 'desconhecido'}".`;
    } else if (badgeType === 'finalist') {
      badgeNamePrefix = `Finalista Oficial`;
      imageUrl = DEFAULT_FINALIST_BADGE_IMAGE;
      description = `Finalista Oficial do Campeonato JackBoo de ${format(championship.startDate, 'MMMM de yyyy', { locale: ptBR })} com o desenho "${submission ? submission.childName : 'desconhecido'}".`;
    } else {
      console.warn(`Tipo de selo desconhecido para concessão: ${badgeType}`);
      return;
    }

    const badgeName = `${badgeNamePrefix} - ${championship.name.split('-')[0].trim()} - ${monthYear}`; // Ex: "Campeão - Campeonato de Desenho - Agosto/2024"

    // Busca ou cria a definição do selo
    const [badge, created] = await Badge.findOrCreate({
      where: { name: badgeName, championshipId: championship.id },
      defaults: {
        type: badgeType,
        imageUrl: imageUrl,
        description: description,
        championshipId: championship.id,
      },
      transaction: transaction,
    });

    // Concede o selo ao usuário
    try {
        await UserBadge.create({
            userId: userId,
            badgeId: badge.id,
            submissionId: submission ? submission.id : null,
            awardDate: new Date(),
            comment: `Concedido por participação no Campeonato JackBoo de ${format(championship.startDate, 'MMMM de yyyy', { locale: ptBR })}.`,
        }, { transaction: transaction });
        console.log(`Selo "${badge.name}" concedido ao usuário ${userId} por submissão ${submission ? submission.id : 'N/A'}.`);
    } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
            console.warn(`Usuário ${userId} já possui o selo "${badge.name}" (ou combinação única já existe para esta submissão).`);
        } else {
            console.error(`Erro ao conceder selo "${badge.name}" ao usuário ${userId}:`, error.message);
        }
    }
  }
}

module.exports = new AdminChampionshipsService();
