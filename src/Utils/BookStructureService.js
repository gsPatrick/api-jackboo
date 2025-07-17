// src/Utils/BookStructureService.js

class BookStructureService {
    /**
     * Retorna a estrutura de páginas padrão para um livro de colorir.
     * @param {number} pageCount - O número total de páginas de colorir desejadas.
     * @returns {Array<object>} A estrutura de páginas.
     */
    static getColoringBookStructure(pageCount = 10) {
        return [
            { pageType: 'cover_front', repeat: 1 },
            { pageType: 'intro_page', repeat: 1 },
            { pageType: 'coloring_page', repeat: pageCount },
            { pageType: 'special_jack_friends', repeat: 1 },
            { pageType: 'back_cover', repeat: 1 },
        ];
    }

    /**
     * Retorna a estrutura de páginas padrão para um livro de história.
     * @param {number} pageCount - O número total de páginas de ilustração/texto.
     * @returns {Array<object>} A estrutura de páginas.
     */
    static getStoryBookStructure(pageCount = 8) {
        const structure = [
            { pageType: 'cover_front', repeat: 1 },
            { pageType: 'intro_page', repeat: 1 },
        ];
        
        // Alterna entre página de ilustração e página de texto
        for (let i = 0; i < pageCount; i++) {
            if (i % 2 === 0) {
                structure.push({ pageType: 'story_illustration', repeat: 1 });
            } else {
                structure.push({ pageType: 'story_text', repeat: 1 });
            }
        }

        structure.push({ pageType: 'special_jack_friends', repeat: 1 });
        structure.push({ pageType: 'back_cover', repeat: 1 });
        
        return structure;
    }

    /**
     * Mapeia um tipo de página funcional para o tipo de configuração de IA correspondente.
     * @param {string} pageType - O tipo funcional da página (ex: 'cover_front').
     * @param {string} bookType - 'coloring' ou 'story' para diferenciar capas.
     * @returns {string} O tipo de configuração da IA (ex: 'story_cover').
     */
    static getAiSettingTypeForPage(pageType, bookType = 'story') {
        const mapping = {
            'cover_front': bookType === 'coloring' ? 'coloring_cover' : 'story_cover',
            'intro_page': 'story_intro',
            'story_illustration': 'story_page_illustration',
            'story_text': 'story_page_text',
            'coloring_page': 'coloring_page',
            'special_jack_friends': 'special_page',
            'back_cover': bookType === 'coloring' ? 'coloring_cover' : 'story_cover',
        };
        return mapping[pageType] || pageType;
    }
}

module.exports = BookStructureService;