// src/Schedulers/championshipScheduler.js
const cron = require('node-cron');
const { Championship } = require('../models');
const { Op } = require('sequelize');
const AdminChampionshipsService = require('../Features-Admin/Championships/AdminChampionships.service');
const { isAfter, set } = require('date-fns');

class ChampionshipScheduler {
  /**
   * Inicia todos os agendamentos relacionados aos campeonatos.
   * Deve ser chamado na inicialização do servidor.
   */
  static start() {
    console.log('⏰ Agendador de Campeonatos iniciado.');

    // Roda a cada 5 minutos para atualizar os status dos campeonatos.
    cron.schedule('*/5 * * * *', this.updateChampionshipStatuses);

    // Roda uma vez por dia (às 03:00 da manhã) para recalcular os prêmios disponíveis.
    cron.schedule('0 3 * * *', this.updateAvailablePrizes);
  }

  /**
   * Tarefa principal que transiciona o status dos campeonatos de forma automática.
   */
  static async updateChampionshipStatuses() {
    console.log('[Scheduler] Executando verificação de status dos campeonatos...');
    const now = new Date();

    try {
      // 1. Abre campeonatos para submissão ('upcoming' -> 'open_for_submissions')
      const upcomingChampionships = await Championship.findAll({
        where: { status: 'upcoming', startDate: { [Op.lte]: now } }
      });
      for (const champ of upcomingChampionships) {
        console.log(`[Scheduler] Abrindo campeonato "${champ.name}" (ID: ${champ.id}) para submissões.`);
        await champ.update({ status: 'open_for_submissions' });
      }

      // 2. Abre campeonatos para votação ('open_for_submissions' -> 'voting')
      // A regra de negócio é que a votação começa no dia 26 do mês de encerramento.
      const submissionChampionships = await Championship.findAll({
        where: { status: 'open_for_submissions' }
      });
      for (const champ of submissionChampionships) {
        // Define a data de início da votação para o dia 26 às 00:00.
        const votingStartDate = set(new Date(champ.endDate), { date: 26, hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });
        if (isAfter(now, votingStartDate)) {
          console.log(`[Scheduler] Abrindo campeonato "${champ.name}" (ID: ${champ.id}) para votação.`);
          await champ.update({ status: 'voting' });
        }
      }

      // 3. Fecha campeonatos ('voting' -> 'closed') e dispara o cálculo de scores
      const votingChampionships = await Championship.findAll({
        where: { status: 'voting', endDate: { [Op.lte]: now } }
      });
      for (const champ of votingChampionships) {
        console.log(`[Scheduler] Fechando campeonato "${champ.name}" (ID: ${champ.id}) e calculando scores.`);
        await champ.update({ status: 'closed' });
        // Dispara o cálculo de scores automaticamente assim que o campeonato fecha para votação.
        // A determinação dos vencedores ainda é um passo manual para o admin.
        await AdminChampionshipsService.calculateFinalScores(champ.id);
      }
    } catch (error) {
      console.error('[Scheduler] Erro ao atualizar status dos campeonatos:', error);
    }
  }

  /**
   * Tarefa diária para atualizar a contagem de prêmios disponíveis com base nas vendas.
   */
  static async updateAvailablePrizes() {
    console.log('[Scheduler] Executando tarefa diária de atualização de prêmios...');
    try {
      const activeChampionships = await Championship.findAll({
        where: { status: { [Op.in]: ['open_for_submissions', 'voting'] } }
      });
      for (const champ of activeChampionships) {
        console.log(`[Scheduler] Atualizando prêmios para o campeonato "${champ.name}" (ID: ${champ.id}).`);
        await AdminChampionshipsService.calculateAvailablePrizes(champ.id);
      }
    } catch (error) {
      console.error('[Scheduler] Erro ao atualizar prêmios disponíveis:', error);
    }
  }
}

module.exports = ChampionshipScheduler;