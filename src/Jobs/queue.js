// src/Jobs/queue.js
const { Queue } = require('bullmq');
require('dotenv').config();

// --- CÓDIGO ORIGINAL (DESATIVADO TEMPORARIAMENTE) ---
/*
const redisConnection = process.env.REDIS_URL;

if (!redisConnection) {
  throw new Error('REDIS_URL não está definida no arquivo .env');
}

const bookGenerationQueue = new Queue('bookGeneration', {
  connection: redisConnection,
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
*/
// --- FIM DO CÓDIGO ORIGINAL ---


// --- NOVO CÓDIGO (SIMULAÇÃO SEM REDIS) ---
// Criamos uma fila falsa que tem o método 'add', mas ele não faz nada.
// Isso impede que a aplicação quebre ao chamar `bookGenerationQueue.add()`.
console.log('[AVISO] Conexão com Redis desativada para teste. A geração de livros em segundo plano não funcionará.');

const bookGenerationQueue = {
  add: async (name, data) => {
    console.log(`[Fila Falsa] Trabalho '${name}' recebido, mas não será adicionado à fila. Dados:`, data);
    return Promise.resolve();
  }
};
// --- FIM DO NOVO CÓDIGO ---


module.exports = { bookGenerationQueue };