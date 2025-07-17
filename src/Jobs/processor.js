// src/Jobs/processor.js (ou onde o seu processador da fila está)

const { bookGenerationQueue } = require('./queue');
const BookCreationService = require('../Features/Content/BookCreationService'); // Este é o worker

// ...

// NOVO PROCESSADOR DE JOB SIMPLIFICADO
bookGenerationQueue.process('generate-simplified-book', async (job) => {
    const { bookId, structure, context, referenceImageUrl } = job.data;
    console.log(`[Worker] Iniciando job SIMPLIFICADO para livro ID: ${bookId}`);
    await BookCreationService._processSimplifiedBookGeneration(bookId, structure, context, referenceImageUrl);
});

// src/Jobs/processor.js

// ...
bookGenerationQueue.process('generate-book-job', async (job) => {
    const { bookId, structure, context, referenceImageUrl } = job.data;
    console.log(`[Worker] Iniciando job para livro ID: ${bookId}`);
    
    // A lógica de processamento fica em um método do worker
    await processBookPages(bookId, structure, context, referenceImageUrl);
});

// O processador antigo 'generate-book' pode ser removido ou mantido para o admin.
// bookGenerationQueue.process('generate-book', ...);