// src/Generators/storyBookGenerator.js
// ...lógica e prompts para o livro de história...
// A estrutura será similar à do coloringBookGenerator.js
// com a adição da geração de texto.

const { Book, BookPage } = require('../models');
const { bookGenerationQueue } = require('../Jobs/queue');

// --- PROMPTS FIXOS PARA O LIVRO DE HISTÓRIA ---
const COVER_PROMPT = "Capa de livro de história infantil, estilo cartoon vetorizado. Personagem [CHARACTER_NAME] em destaque. A cena reflete o tema '[THEME]' e o local '[LOCATION]'. Título do livro '[TITLE]' bem visível. Estilo artístico inspirado na imagem de referência do personagem.";
const STORY_ILLUSTRATION_PROMPT = "Ilustração para livro de história infantil, página inteira, estilo cartoon vetorizado. Personagem: [CHARACTER_NAME]. A cena ilustra a seguinte parte da história: '[PAGE_TEXT]'. O local é [LOCATION] e o tema é [THEME]. Manter o estilo visual do personagem de referência.";
const STORY_TEXT_PROMPT = "Você é um escritor de histórias infantis. A história completa é sobre: [SUMMARY]. O personagem principal é [CHARACTER_NAME]. O tema é [THEME] e o local é [LOCATION]. Gere o texto para a página [PAGE_NUMBER] de [TOTAL_PAGES]. O texto deve ser curto, simples, alegre e avançar a narrativa. Não inclua 'Página X:' no texto. Máximo de 3 frases.";
const BACK_COVER_PROMPT = "Contra-capa de um livro de história infantil. Mostra [CHARACTER_NAME] acenando 'Até a próxima aventura!'. Inclui um breve resumo da história: '[SUMMARY]'. Logo 'JackBoo' no canto.";

async function generateStoryBook(userId, data, adminData = {}) {
    // ... lógica para buscar o personagem ...
    const { character, referenceImageUrl } = await _getCharacterDetails(userId, data, adminData);
    
    const { theme, location, summary, pageCount = 8 } = data;
    const bookTitle = `${character.name}: ${theme} em ${location}`;

    const book = await Book.create({
        // ... dados do livro ...
    });

    // A estrutura aqui é mais complexa, pois texto e imagem são gerados em etapas.
    const bookStructure = [
        { pageType: 'cover_front', prompt: COVER_PROMPT, repeats: 1 },
        // A geração de texto e imagem precisa ser sequencial por página.
        // O worker terá que lidar com essa lógica.
    ];

    for (let i = 0; i < pageCount; i++) {
        bookStructure.push({ pageType: 'story_text', prompt: STORY_TEXT_PROMPT, pageNumber: i + 1, totalPages: pageCount });
        bookStructure.push({ pageType: 'story_illustration', prompt: STORY_ILLUSTRATION_PROMPT });
    }
    bookStructure.push({ pageType: 'back_cover', prompt: BACK_COVER_PROMPT, repeats: 1 });


    await bookGenerationQueue.add('generate-book-job', {
        bookId: book.id,
        structure: bookStructure,
        context: {
            TITLE: bookTitle,
            THEME: theme,
            LOCATION: location,
            SUMMARY: summary,
            CHARACTER_NAME: character.name,
        },
        referenceImageUrl,
    });

    return book;
}

// ... função _getCharacterDetails ...

module.exports = { generateStoryBook };