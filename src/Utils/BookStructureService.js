// src/Utils/BookStructureService.js

class BookStructureService {
    /**
     * Retorna a estrutura de páginas padrão para um livro de colorir.
     * @param {number} pageCount - O número total de páginas de colorir desejadas.
     * @returns {Array<object>} A estrutura de páginas.
     */
    static getColoringBookStructure(pageCount = 10) {
        // A ordem e os tipos FUNCIONAIS das páginas.
        // A escolha de QUAL AI Setting usar para CADA UMA dessas páginas
        // será definida nas configurações padrão do usuário (tabela 'settings').
        return [
            { pageType: 'cover_front', repeat: 1 },
            { pageType: 'intro_page', repeat: 1 }, // Página de introdução pode ter um texto padrão
            { pageType: 'coloring_page', repeat: pageCount },
            { pageType: 'special_jack_friends', repeat: 1 },
            { pageType: 'back_cover', repeat: 1 },
        ];
    }

    /**
     * Retorna a estrutura de páginas padrão para um livro de história.
     * @param {number} pageCount - O número total de páginas de ilustração/texto (cenas).
     * @returns {Array<object>} A estrutura de páginas.
     */
    static getStoryBookStructure(pageCount = 8) {
        const structure = [
            { pageType: 'cover_front', repeat: 1 },
            { pageType: 'intro_page', repeat: 1 },
        ];
        
        // Alterna entre página de ilustração e página de texto
        // Para cada "cena", temos uma ilustração e um texto
        for (let i = 0; i < pageCount; i++) {
            structure.push({ pageType: 'story_illustration', repeat: 1 });
            structure.push({ pageType: 'story_text', repeat: 1 });
        }

        structure.push({ pageType: 'special_jack_friends', repeat: 1 });
        structure.push({ pageType: 'back_cover', repeat: 1 });
        
        return structure;
    }

    /**
     * REMOVIDO: Este método não é mais necessário porque o AI Setting é único para o livro/personagem.
     * A lógica de qual AI Setting usar é agora lida pelo BookCreationService/ContentService
     * lendo a configuração padrão da tabela 'settings'.
     */
    // static getAiSettingTypeForPage(pageType, bookType = 'story') {
    //     // ... lógica removida
    // }
}

module.exports = BookStructureService;