// src/Jobs/processor.js
const { Worker } = require('bullmq');
const BookCreationService = require('../Features/Content/BookCreation.service');
require('dotenv').config();

// CORREÇÃO: Usamos a mesma lógica do queue.js para passar a URL completa.
const redisConnection = process.env.REDIS_URL;

if (!redisConnection) {
  throw new Error('REDIS_URL não está definida no arquivo .env');
}

const bookGenerationWorker = new Worker('bookGeneration', async job => {
  const { bookId, userInputs } = job.data;
  console.log(`[Worker] Processando job ${job.id} para o livro ID: ${bookId}`);

  try {
    await BookCreationService._processBookGeneration(bookId, userInputs);
    console.log(`[Worker] Job ${job.id} para o livro ID: ${bookId} concluído com sucesso.`);
  } catch (error) {
    console.error(`[Worker] Job ${job.id} para o livro ID: ${bookId} falhou.`, error);
    throw error;
  }
}, { 
  connection: redisConnection, // A mágica acontece aqui também!
  concurrency: 2 
});

bookGenerationWorker.on('completed', job => {
  console.log(`[Worker] Evento 'completed' para job ${job.id}`);
});

bookGenerationWorker.on('failed', (job, err) => {
  console.error(`[Worker] Evento 'failed' para job ${job.id}. Erro: ${err.message}`);
});

console.log('🚀 Worker de geração de livros iniciado e aguardando jobs...');

module.exports = bookGenerationWorker;