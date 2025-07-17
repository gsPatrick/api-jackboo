const { Championship, Submission, User, Vote, sequelize } = require('../../models');
const { Op } = require('sequelize');
const { isAfter, isBefore, isWithinInterval, startOfMonth, endOfMonth, parseISO } = require('date-fns');

// Cooldown de 5 segundos para evitar spamming de votos do mesmo IP/usuário
const VOTE_COOLDOWN_SECONDS = 5;
const VOTE_COOLDOWN_MS = VOTE_COOLDOWN_SECONDS * 1000;


class ChampionshipService {
  /**
   * Encontra o campeonato ativo para submissões/votação.
   * @returns {Championship} O campeonato atual.
   */
  async findCurrentActiveChampionship() {
    const today = new Date();
    const championship = await Championship.findOne({
      where: {
        startDate: { [Op.lte]: today },
        endDate: { [Op.gte]: today },
        status: { [Op.in]: ['open_for_submissions', 'voting'] }
      },
      order: [['startDate', 'DESC']]
    });
    if (!championship) {
      throw new Error('Nenhum campeonato ativo no momento para submissões ou votação.');
    }
    return championship;
  }

  /**
   * Permite que um usuário submeta um desenho para o campeonato.
   * @param {number} userId - ID do usuário logado (responsável).
   * @param {object} submissionData - Dados da submissão (childName, childAge, ageGroup, pageIdentifier).
   * @param {object} file - Objeto do arquivo de imagem do desenho.
   * @returns {Submission} O objeto da submissão criada.
   */
  async submitDrawing(userId, submissionData, file) {
    const { childName, childAge, ageGroup, pageIdentifier } = submissionData;

    // 1. Encontrar o campeonato ativo para submissões
    const championship = await this.findCurrentActiveChampionship();
    
    // Verificar se o período de submissão está aberto (até dia 25)
    const submissionDeadline = new Date(championship.endDate);
    submissionDeadline.setDate(25); // Defina o dia 25 do mês de término

    if (isAfter(new Date(), submissionDeadline)) {
      throw new Error('O período de submissão para o campeonato atual foi encerrado.');
    }
    
    // 2. Validar limite de 3 desenhos por mês por criança/usuário
    const submissionsCount = await Submission.count({
      where: {
        userId,
        championshipId: championship.id,
        createdAt: {
          [Op.gte]: startOfMonth(championship.startDate),
          [Op.lte]: endOfMonth(championship.endDate)
        }
      }
    });

    if (submissionsCount >= 3) {
      throw new Error('Você atingiu o limite de 3 desenhos por criança/conta neste campeonato.');
    }

    // 3. Validar a faixa etária
    const validAgeGroups = {
      '3-5': { min: 3, max: 5 },
      '6-8': { min: 6, max: 8 },
      '9-11': { min: 9, max: 11 },
      '12+': { min: 12, max: 99 } // Usar um valor alto para "ou mais"
    };

    if (!validAgeGroups[ageGroup] || childAge < validAgeGroups[ageGroup].min || childAge > validAgeGroups[ageGroup].max) {
      throw new Error(`A idade da criança (${childAge} anos) não corresponde à faixa etária selecionada (${ageGroup}).`);
    }

    // 4. Validar o arquivo de desenho
    if (!file) {
      throw new Error('O arquivo de desenho é obrigatório.');
    }
    const drawingUrl = `/uploads/${file.filename}`; // Em produção, seria a URL do S3/Cloudinary

    // 5. TODO: Implementar validação do pageIdentifier (QR Code/serial)
    // Atualmente, é apenas um string. Em um sistema real, você teria um banco de dados
    // de códigos válidos ou um serviço de leitura de QR code.
    // Exemplo: const isValidPage = await PageIdentifierService.validate(pageIdentifier);
    // if (!isValidPage) throw new Error('Código da página Jackboo inválido ou não reconhecido.');
    console.log(`Validação de pageIdentifier (QR/serial) pendente para: ${pageIdentifier}`);


    // 6. Criar a submissão
    const submission = await Submission.create({
      userId,
      championshipId: championship.id,
      childName,
      childAge,
      ageGroup,
      drawingUrl,
      pageIdentifier,
      status: 'pending_approval', // Padrão, aguardando aprovação do admin
    });

    return submission;
  }

  /**
   * Lista as submissões aprovadas de um campeonato para a galeria pública.
   * @param {number} championshipId - ID do campeonato.
   * @param {object} filters - Filtros como ageGroup, page, limit.
   * @returns {object} Lista de submissões paginadas.
   */
  async listPublicSubmissions(championshipId, filters = {}) {
    const { ageGroup, page = 1, limit = 10, sortBy = 'createdAt', order = 'DESC' } = filters;
    const whereClause = {
      championshipId,
      status: 'approved', // Apenas submissões aprovadas são públicas
    };

    if (ageGroup) {
      whereClause.ageGroup = ageGroup;
    }

    const { count, rows } = await Submission.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'submitter', attributes: ['id', 'nickname', 'avatarUrl'] },
        // Adicionar informações sobre a contagem de votos
      ],
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      order: [[sortBy, order]],
    });

    // Para cada submissão, obter a contagem de votos (melhor otimizar com um subquery ou view para performance em escala)
    const submissionsWithVotes = await Promise.all(rows.map(async (submission) => {
        const totalVotes = await Vote.count({ where: { submissionId: submission.id } });
        return {
            ...submission.toJSON(),
            totalVotes: totalVotes,
        };
    }));

    return { totalItems: count, submissions: submissionsWithVotes, totalPages: Math.ceil(count / limit), currentPage: parseInt(page, 10) };
  }

  /**
   * Permite que um usuário (autenticado ou anônimo) vote em uma submissão.
   * Inclui lógica anti-fraude de cooldown.
   * @param {number} submissionId - ID da submissão.
   * @param {number} [userId] - ID do usuário logado (opcional).
   * @param {string} [voterIp] - IP do votante (opcional).
   * @returns {object} Status do voto (voted: boolean).
   */
  async toggleVote(submissionId, userId, voterIp) {
    const submission = await Submission.findByPk(submissionId);
    if (!submission) {
      throw new Error('Submissão não encontrada.');
    }
    
    const championship = await Championship.findByPk(submission.championshipId);
    if (!championship || championship.status !== 'voting') {
      throw new Error('O período de votação para este campeonato não está ativo.');
    }

    // Verificar se o voto está dentro do prazo (até dia 25)
    const votingDeadline = new Date(championship.endDate);
    votingDeadline.setDate(25); // Defina o dia 25 do mês de término

    if (isAfter(new Date(), votingDeadline)) {
      throw new Error('O período de votação para o campeonato atual foi encerrado.');
    }

    // --- Lógica Anti-Fraude: Cooldown de Voto ---
    // Verifica se o usuário/IP votou recentemente (para qualquer submissão)
    const recentVote = await Vote.findOne({
        where: {
            createdAt: { [Op.gte]: new Date(Date.now() - VOTE_COOLDOWN_MS) },
            [Op.or]: [
                userId ? { userId } : {},
                voterIp ? { voterIp } : {},
            ].filter(Boolean), // Filtra objetos vazios se userId/voterIp for null
        }
    });

    if (recentVote) {
        throw new Error(`Aguarde ${VOTE_COOLDOWN_SECONDS} segundos entre os votos.`);
    }
    // ---------------------------------------------

    // Verifica se já existe um voto pelo usuário OU pelo IP para ESTA submissão
    let existingVote;
    if (userId) {
      existingVote = await Vote.findOne({ where: { submissionId, userId } });
    } else if (voterIp) {
      existingVote = await Vote.findOne({ where: { submissionId, voterIp } });
    } else {
      throw new Error('É necessário ser um usuário logado ou fornecer um IP para votar.');
    }

    if (existingVote) {
      // Se já votou, remove o voto
      await existingVote.destroy();
      return { message: 'Voto removido.', voted: false };
    } else {
      // Se não votou, adiciona o voto
      await Vote.create({ submissionId, userId, voterIp });
      return { message: 'Voto adicionado.', voted: true };
    }
  }

  /**
   * Obtém a contagem de votos de uma submissão e se o usuário logado já votou.
   * @param {number} submissionId - ID da submissão.
   * @param {number} [userId] - ID do usuário logado (opcional).
   * @param {string} [voterIp] - IP do votante (opcional).
   * @returns {object} Contagem de votos e status de voto do usuário.
   */
  async getSubmissionVoteStatus(submissionId, userId, voterIp) {
    const totalVotes = await Vote.count({ where: { submissionId } });
    let userVoted = false;

    if (userId) {
      userVoted = !!(await Vote.findOne({ where: { submissionId, userId } }));
    } else if (voterIp) {
      userVoted = !!(await Vote.findOne({ where: { submissionId, voterIp } }));
    }
    
    return { totalVotes, userVoted };
  }
}

module.exports = new ChampionshipService();

