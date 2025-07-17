// src/Jobs/queue.js
const { Queue } = require('bullmq');
require('dotenv').config();

// CORREÇÃO: Passamos a URL completa diretamente. A biblioteca sabe como interpretá-la.
const redisConnection = process.env.REDIS_URL;

if (!redisConnection) {
  throw new Error('REDIS_URL não está definida no arquivo .env');
}

// Criamos uma fila chamada 'bookGeneration'
const bookGenerationQueue = new Queue('bookGeneration', {
  connection: redisConnection, // A mágica acontece aqui!
  defaultJobOptions: {
    attempts: 3, 
    backoff: {
      type: 'exponential',
      delay: 5000, 
    },
    removeOnComplete: true,
    removeOnFail: 1000, 
  },
});

module.exports = { bookGenerationQueue };