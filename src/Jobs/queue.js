// src/Jobs/queue.js
const { Queue } = require('bullmq');
require('dotenv').config();

const redisConnection = {
  host: process.env.REDIS_URL.split(':')[1].replace('//', ''),
  port: process.env.REDIS_URL.split(':')[2],
};

// Criamos uma fila chamada 'bookGeneration'
const bookGenerationQueue = new Queue('bookGeneration', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3, // Tenta reprocessar o job 3 vezes em caso de falha
    backoff: {
      type: 'exponential',
      delay: 5000, // Atraso de 5s para a primeira tentativa, depois exponencialmente maior
    },
    removeOnComplete: true, // Remove o job da fila quando completado com sucesso
    removeOnFail: 1000, // Mantém os 1000 jobs que falharam para análise
  },
});

module.exports = { bookGenerationQueue };