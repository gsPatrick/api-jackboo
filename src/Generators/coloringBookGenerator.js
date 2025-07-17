// src/Generators/coloringBookGenerator.js

const { Book, BookPage } = require('../models');
const { bookGenerationQueue } = require('../Jobs/queue');

// --- PROMPTS FIXOS PARA O LIVRO DE COLORIR ---
const COVER_PROMPT = "Capa de livro de colorir, estilo cartoon infantil vetorizado. No centro, o personagem [CHARACTER_NAME]. O tema é '[THEME]'. O título do livro é '[TITLE]'. Fundo branco, com alguns elementos do tema para colorir. Cores vibrantes apenas no personagem e no título.";
const INTRO_PAGE_PROMPT = "Página de introdução de um livro de colorir. Texto grande e amigável: 'Este livro pertence a:'. Abaixo, uma linha para a criança escrever o nome. Decorações simples nas bordas relacionadas ao tema '[THEME]', com contornos pretos para colorir.";
const COLORING_PAGE_PROMPT = "Página de colorir para crianças. Contornos pretos grossos e bem definidos, sem preenchimento de cor (apenas linhas). Personagem: [CHARACTER_NAME]. A cena mostra o personagem em uma aventura relacionada ao tema '[THEME]'. Fundo simples e divertido, com muitos espaços para colorir.";
const BACK_COVER_PROMPT = "Contra-capa de livro de colorir. Mostra o personagem [CHARACTER_NAME] em uma pose divertida, acenando 'tchau'. Inclui um pequeno logo 'JackBoo' no canto inferior. Fundo com um padrão simples relacionado ao tema '[THEME]'.";

/**
 * Inicia o processo de geração de um livro de colorir.
 * Cria o livro no banco e adiciona a tarefa na fila do worker.
 * @param {number} userId - ID do usuário.
 * @param {object} data - { characterId, theme }.
 * @param {object} adminData - { officialCharacters: ['jackboo', 'bella'], format: '...' }.
 * @returns {Promise<Book>} A instância do livro criado.
 */
async function generateColoringBook(userId, data, adminData = {}) {
    // Lógica para buscar o personagem (seja do usuário ou oficial)
    const { character, referenceImageUrl } = await _getCharacterDetails(userId, data, adminData);

    const bookTitle = `${character.name} e a Aventura de Colorir sobre ${data.theme}`;
    const pageCount = 10; // Fixo para o usuário

    // 1. Cria o registro do livro no banco.
    const book = await Book.create({
        authorId: userId,
        mainCharacterId: character.id, // Pode ser null se for personagem oficial
        title: bookTitle,
        status: 'gerando',
        storyPrompt: {
            generator: 'coloringBookGenerator', // Identificador do gerador
            theme: data.theme,
            characterName: character.name,
        }
    });

    // 2. Define a estrutura COMPLETA do livro aqui.
    const bookStructure = [
        { pageType: 'cover_front', prompt: COVER_PROMPT, repeats: 1 },
        { pageType: 'intro_page', prompt: INTRO_PAGE_PROMPT, repeats: 1 },
        { pageType: 'coloring_page', prompt: COLORING_PAGE_PROMPT, repeats: pageCount },
        { pageType: 'back_cover', prompt: BACK_COVER_PROMPT, repeats: 1 },
    ];

    // 3. Adiciona o job na fila.
    await bookGenerationQueue.add('generate-book-job', {
        bookId: book.id,
        structure: bookStructure,
        context: {
            TITLE: bookTitle,
            THEME: data.theme,
            CHARACTER_NAME: character.name,
        },
        referenceImageUrl,
    });

    return book;
}

// Função auxiliar privada para não poluir o export
async function _getCharacterDetails(userId, data, adminData) {
    const { Character } = require('../models');
    const OFFICIAL_CHARACTERS = require('./officialCharacters'); // Arquivo separado para os dados dos personagens

    if (adminData.officialCharacters && adminData.officialCharacters.length > 0) {
        const mainOfficialKey = adminData.officialCharacters[0];
        const officialChar = OFFICIAL_CHARACTERS[mainOfficialKey];
        if (!officialChar) throw new Error('Personagem oficial inválido.');
        return {
            character: { id: null, name: officialChar.name },
            referenceImageUrl: officialChar.url
        };
    } else {
        const character = await Character.findOne({ where: { id: data.characterId, userId } });
        if (!character) throw new Error('Personagem não encontrado ou não pertence a você.');
        return {
            character,
            referenceImageUrl: character.generatedCharacterUrl
        };
    }
}

module.exports = { generateColoringBook };