// src/Features/Content/SimplifiedGenerationService.js

const { Book, BookPage, Character, sequelize } = require('../../models');
const { bookGenerationQueue } = require('../../Jobs/queue');
const imageGenerationService = require('../../OpenAI/services/imageGeneration.service');
const { constructPrompt } = require('../../OpenAI/utils/promptConstructor');
const PDFGenerator = require('../../Utils/PDFGenerator');
const TextToImageService = require('../../Utils/TextToImageService');

// --- PROMPTS E IMAGENS FIXAS ---

const OFFICIAL_CHARACTERS_ASSETS = {
    'jackboo': { name: 'JackBoo', url: '/uploads/admin-assets/JackBoo.png' },
    'bella':   { name: 'Bella',   url: '/uploads/admin-assets/Bella.png'   },
    'daisy':   { name: 'Daisy',   url: '/uploads/admin-assets/Daisy.png'   },
    'buddy':   { name: 'Buddy',   url: '/uploads/admin-assets/Buddy.png'   },
    'oliver':  { name: 'Oliver',  url: '/uploads/admin-assets/Oliver.png'  },
};

const CHARACTER_GENERATION_PROMPT = `Using the uploaded reference images of Jack and friends as style examples, and the newly uploaded reference image [[IMAGE]], generate a cartoon-style illustration that transforms [[IMAGE]] to match the exact visual style of Jack:

• Cartoon infantil, traço vetorizado
• Contorno limpo e contínuo, espessura consistente
• Cores chapadas, vibrantes, sem degradês ou texturas complexas
• Olhos grandes e expressivos, nariz arredondado pequeno
• Proporções infantis: cabeça maior, corpo compacto
• Expressão amigável, acolhedora
• Fundo simples e alegre — cor sólida ou cenário infantil minimalista
• Preservar semelhança com a imagem original (postura, características principais)
• Alta resolução (ex: PNG), fundo transparente opcional

Style reference: follow exact line weight, color palette, facial proportions and simplicity found in the Jack images.`;

// PLACEHOLDERS PARA OS OUTROS PROMPTS (conforme solicitado)
const COLORING_BOOK_COVER_PROMPT = "Capa de livro de colorir, estilo cartoon infantil vetorizado. Personagem [CHARACTER_NAME] no centro. Tema da capa: [THEME]. Título do livro '[TITLE]' em destaque. Cores vibrantes, fundo alegre.";
const COLORING_BOOK_PAGE_PROMPT = "Página de colorir para crianças, contornos pretos bem definidos, sem preenchimento de cor (apenas linhas). Personagem: [CHARACTER_NAME]. Cena: [CHARACTER_NAME] vivendo uma aventura sobre o tema '[THEME]'. Fundo simples para colorir.";

const STORY_BOOK_COVER_PROMPT = "Capa de livro de história infantil, estilo cartoon vetorizado. Personagem [CHARACTER_NAME] em destaque. A cena reflete o tema '[THEME]' e o local '[LOCATION]'. Título do livro '[TITLE]' bem visível. Estilo artístico inspirado na imagem de referência do personagem.";
const STORY_BOOK_ILLUSTRATION_PROMPT = "Ilustração para livro de história infantil, página inteira, estilo cartoon vetorizado. Personagem: [CHARACTER_NAME]. A cena ilustra a seguinte parte da história: '[SCENE_SUMMARY]'. O local é [LOCATION] e o tema é [THEME]. Manter o estilo visual do personagem de referência.";
const STORY_BOOK_TEXT_GENERATION_PROMPT = "Você é um escritor de histórias infantis. Escreva um parágrafo curto e simples (máximo 50 palavras) para uma página de livro infantil. A história geral é sobre: [SUMMARY]. Esta cena específica é sobre: [SCENE_SUMMARY]. O personagem principal é [CHARACTER_NAME]. O tom deve ser alegre e educativo.";


class SimplifiedGenerationService {

    /**
     * Gera um personagem para o usuário com prompt fixo.
     */
    static async generateCharacter(userId, file) {
        if (!file) {
            throw new Error('A imagem do desenho é obrigatória.');
        }
        const originalDrawingUrl = `/uploads/user-drawings/${file.filename}`;

        const character = await Character.create({
            userId,
            name: "Meu Novo Personagem", // Nome padrão, usuário pode editar depois
            originalDrawingUrl,
        });

        const referenceAssets = Object.values(OFFICIAL_CHARACTERS_ASSETS).map(asset => ({
            description: `Imagem de referência do personagem ${asset.name}`,
            // A IA não usa a URL, mas a descrição ajuda a guiar o estilo
        }));

        // O promptConstructor agora precisa lidar com um placeholder [[IMAGE]]
        // Vamos apenas adicionar a URL da imagem de referência na descrição
        const finalPrompt = CHARACTER_GENERATION_PROMPT.replace('[[IMAGE]]', `a imagem enviada pelo usuário, cujo URL é ${originalDrawingUrl}`);
        
        // Simulação da chamada à IA (a lógica real usaria imageGenerationService)
        // O ideal é que o imageGenerationService seja adaptado para receber a URL da imagem de referência
        const generatedCharacterUrl = await imageGenerationService.generateWithImagePrompt(finalPrompt, originalDrawingUrl);
        
        await character.update({ generatedCharacterUrl, name: `Personagem ${character.id}` });
        return character;
    }

    /**
     * Orquestra a criação de um livro de colorir.
     */
    static async createColoringBook(userId, data, adminOptions = {}) {
        const { characterId, theme } = data;
        const { officialCharacters = [] } = adminOptions; // Ex: ['jackboo', 'bella']

        let mainCharacter, referenceImageUrl, bookTitle;

        if (officialCharacters.length > 0) {
            // Fluxo do Admin
            const mainOfficial = OFFICIAL_CHARACTERS_ASSETS[officialCharacters[0]];
            if (!mainOfficial) throw new Error("Personagem oficial principal inválido.");
            mainCharacter = { id: null, name: mainOfficial.name }; // Objeto simulado
            referenceImageUrl = mainOfficial.url;
            bookTitle = `${mainOfficial.name} em: ${theme}`;
        } else {
            // Fluxo do Usuário
            if (!characterId || !theme) throw new Error("ID do Personagem e Tema são obrigatórios.");
            mainCharacter = await Character.findByPk(characterId);
            if (!mainCharacter || mainCharacter.userId !== userId) throw new Error("Personagem não encontrado ou não pertence a você.");
            referenceImageUrl = mainCharacter.generatedCharacterUrl;
            bookTitle = `${mainCharacter.name} em: ${theme}`;
        }

        // 1. Criar o registro do livro no banco com status 'gerando'
        const book = await Book.create({
            authorId: userId,
            mainCharacterId: mainCharacter.id, // Pode ser null para livros de admin
            title: bookTitle,
            status: 'gerando',
            storyPrompt: { type: 'coloring', theme, characterName: mainCharacter.name, referenceImageUrl }
        });

        // 2. Definir a estrutura do livro no código
        const structure = [
            { type: 'cover', promptTemplate: COLORING_BOOK_COVER_PROMPT, repeats: 1 },
            // Pode adicionar página de introdução se quiser
            { type: 'page', promptTemplate: COLORING_BOOK_PAGE_PROMPT, repeats: 10 }, // 10 páginas fixas
        ];

        // 3. Adicionar o Job na fila com os dados já processados
        await bookGenerationQueue.add('generate-simplified-book', {
            bookId: book.id,
            structure,
            context: {
                TITLE: book.title,
                CHARACTER_NAME: mainCharacter.name,
                THEME: theme,
            },
            referenceImageUrl
        });

        return book;
    }

    /**
     * Orquestra a criação de um livro de história.
     */
    static async createStoryBook(userId, data, adminOptions = {}) {
        const { characterId, theme, location, summary, pageCount = 8 } = data;
        const { officialCharacters = [] } = adminOptions;

        let mainCharacter, referenceImageUrl, bookTitle;

        if (officialCharacters.length > 0) {
            const mainOfficial = OFFICIAL_CHARACTERS_ASSETS[officialCharacters[0]];
            if (!mainOfficial) throw new Error("Personagem oficial principal inválido.");
            mainCharacter = { id: null, name: mainOfficial.name };
            referenceImageUrl = mainOfficial.url;
            bookTitle = `${mainOfficial.name} - ${theme}`;
        } else {
            if (!characterId || !theme || !location || !summary) throw new Error("Todos os campos são obrigatórios.");
            mainCharacter = await Character.findByPk(characterId);
            if (!mainCharacter || mainCharacter.userId !== userId) throw new Error("Personagem não encontrado ou não pertence a você.");
            referenceImageUrl = mainCharacter.generatedCharacterUrl;
            bookTitle = `${mainCharacter.name} - ${theme}`;
        }

        const book = await Book.create({
            authorId: userId,
            mainCharacterId: mainCharacter.id,
            title: bookTitle,
            status: 'gerando',
            storyPrompt: { type: 'story', theme, location, summary, characterName: mainCharacter.name, referenceImageUrl }
        });

        // A geração de texto e cenas precisa de mais detalhes. Vamos assumir que cada "cena" é um prompt.
        // Para simplificar, vamos usar o `summary` como base para todas as páginas.
        const structure = [
            { type: 'cover', promptTemplate: STORY_BOOK_COVER_PROMPT, repeats: 1 },
        ];
        for (let i = 0; i < pageCount; i++) {
            structure.push({ type: 'illustration', promptTemplate: STORY_BOOK_ILLUSTRATION_PROMPT, scene_summary: `Parte ${i + 1} da história.` });
            structure.push({ type: 'text', promptTemplate: STORY_BOOK_TEXT_GENERATION_PROMPT, scene_summary: `Parte ${i + 1} da história.` });
        }

        await bookGenerationQueue.add('generate-simplified-book', {
            bookId: book.id,
            structure,
            context: {
                TITLE: book.title,
                CHARACTER_NAME: mainCharacter.name,
                THEME: theme,
                LOCATION: location,
                SUMMARY: summary,
            },
            referenceImageUrl
        });

        return book;
    }
}

module.exports = SimplifiedGenerationService;