// src/Jobs/processor.js
const { Worker } = require('bullmq');
const BookCreationService = require('../Features/Content/BookCreation.service');
require('dotenv').config();

const redisConnection = {
  host: process.env.REDIS_URL.split(':')[1].replace('//', ''),
  port: process.env.REDIS_URL.split(':')[2],
};

const bookGenerationWorker = new Worker('bookGeneration', async job => {
  const { bookId, userInputs } = job.data;
  console.log(`[Worker] Processando job ${job.id} para o livro ID: ${bookId}`);

  try {
    // A mágica acontece aqui: chamamos a mesma lógica de antes
    // O 'await' aqui é importante para que o worker saiba quando a tarefa terminou
    await BookCreationService._processBookGeneration(bookId, userInputs);
    console.log(`[Worker] Job ${job.id} para o livro ID: ${bookId} concluído com sucesso.`);
  } catch (error) {
    console.error(`[Worker] Job ${job.id} para o livro ID: ${bookId} falhou.`, error);
    // Lança o erro para que o BullMQ possa registrar a falha e tentar novamente
    throw error;
  }
}, { 
  connection: redisConnection,
  concurrency: 2 // Processa no máximo 2 livros ao mesmo tempo para não sobrecarregar a API da OpenAI
});

bookGenerationWorker.on('completed', job => {
  console.log(`[Worker] Evento 'completed' para job ${job.id}`);
});

bookGenerationWorker.on('failed', (job, err) => {
  console.error(`[Worker] Evento 'failed' para job ${job.id}. Erro: ${err.message}`);
});

console.log('🚀 Worker de geração de livros iniciado e aguardando jobs...');

module.exports = bookGenerationWorker;