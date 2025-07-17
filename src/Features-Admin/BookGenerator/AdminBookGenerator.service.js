// src/Features-Admin/BookGenerator/AdminBookGenerator.service.js
const { Book, BookPage, Character, PrintFormat, OpenAISetting, sequelize } = require('../../models');
const BookStructureService = require('../../Utils/BookStructureService');
const imageGenerationService = require('../../OpenAI/services/imageGeneration.service');
const PDFGenerator = require('../../Utils/PDFGenerator');

const ADMIN_USER_ID = 1; // ID do usuário "Sistema/JackBoo"

class AdminBookGeneratorService {

    /**
     * Inicia o processo de geração de um livro pelo admin.
     * Cria o livro e todas as suas páginas no banco com status 'pending'.
     * Diferente do fluxo do usuário, este processo é síncrono e aguarda a geração.
     * @param {string} bookType - 'coloring' ou 'story'.
     * @param {object} generationData - Dados do formulário do admin.
     * @returns {Book} O objeto do livro com suas páginas geradas.
     */
    static async generateBookPreview(bookType, generationData) {
        const { theme, title, characterId, printFormatId, pageCount, location, summary } = generationData;

        // Validações básicas
        if (!bookType || !title || !printFormatId) {
            throw new Error("Tipo, título e formato de impressão são obrigatórios.");
        }
        
        // Inicia uma transação para garantir a consistência
        const t = await sequelize.transaction();
        let book;

        try {
            // 1. Cria a entidade principal do livro
            book = await Book.create({
                authorId: ADMIN_USER_ID,
                title,
                characterId: characterId || null,
                printFormatId,
                status: 'gerando', // Status inicial
                genre: theme, // Usando o tema como gênero
                storyPrompt: { theme, location, summary }
            }, { transaction: t });

            // 2. Obter a estrutura de páginas
            let structure;
            if (bookType === 'coloring') {
                structure = BookStructureService.getColoringBookStructure(pageCount);
            } else { // story
                structure = BookStructureService.getStoryBookStructure(pageCount);
            }

            // 3. Criar as entradas de BookPage
            const pageCreationPromises = [];
            let currentPageNumber = 1;
            for (const pageDef of structure) {
                for (let i = 0; i < pageDef.repeat; i++) {
                    const promise = BookPage.create({
                        bookId: book.id,
                        pageNumber: currentPageNumber++,
                        pageType: pageDef.pageType,
                        status: 'pending',
                        userInputJson: { theme, location, summary }
                    }, { transaction: t });
                    pageCreationPromises.push(promise);
                }
            }
            await Promise.all(pageCreationPromises);

            await t.commit(); // Comita a criação do livro e das páginas vazias

        } catch (error) {
            await t.rollback();
            console.error("[AdminGenerator] Erro ao criar a estrutura do livro:", error);
            throw new Error("Falha ao iniciar a criação do livro.");
        }

        // 4. Gerar o conteúdo de cada página (fora da transação inicial)
        // Isso pode ser feito em paralelo para acelerar o processo do admin
        const bookWithPages = await Book.findByPk(book.id, {
            include: [{ model: BookPage, as: 'pages', order: [['pageNumber', 'ASC']] }, 'mainCharacter']
        });
        
        const generationPromises = bookWithPages.pages.map(page => 
            this.generateSinglePageContent(page, bookWithPages, generationData)
        );
        
        await Promise.all(generationPromises);

        // 5. Retorna o livro completo com as páginas geradas para o preview
        return Book.findByPk(book.id, { include: ['pages'] });
    }

    /**
     * Lógica isolada para gerar (ou regerar) o conteúdo de uma única página.
     * @param {BookPage} page - A instância da página a ser gerada.
     * @param {Book} book - A instância do livro pai.
     * @param {object} generationData - Os inputs originais.
     */
    static async generateSinglePageContent(page, book, generationData) {
        try {
            await page.update({ status: 'generating' });

            const aiSettingType = BookStructureService.getAiSettingTypeForPage(page.pageType);
            const aiSetting = await OpenAISetting.findOne({ where: { type: aiSettingType } });
            
            if (!aiSetting) throw new Error(`Configuração de IA para o tipo '${aiSettingType}' não encontrada.`);

            const generatedImageUrl = await imageGenerationService.generateFromTemplate({
                aiSettingId: aiSetting.id,
                book,
                userInputs: generationData,
                page
            });

            await page.update({ generatedImageUrl, status: 'completed', errorDetails: null });
        } catch (error) {
            console.error(`[AdminGenerator] Falha ao gerar página ${page.id}:`, error.message);
            await page.update({ status: 'failed', errorDetails: error.message });
        }
    }
    
    /**
     * Finaliza um livro, mudando seu status e gerando o PDF.
     * @param {number} bookId - O ID do livro a ser finalizado.
     */
    static async finalizeBook(bookId) {
        const book = await Book.findByPk(bookId, { include: ['pages'] });
        if (!book) throw new Error("Livro não encontrado.");
        if (book.pages.some(p => p.status !== 'completed')) {
            throw new Error("Não é possível finalizar. Algumas páginas ainda estão pendentes ou falharam.");
        }

        await PDFGenerator.generatePdfFromBook(bookId);
        await book.update({ status: 'privado' }); // Ou 'publicado', se for o caso

        return book;
    }
}

// Pequeno ajuste no BookStructureService para facilitar a busca do tipo de IA
BookStructureService.getAiSettingTypeForPage = (pageType) => {
    const mapping = {
        'cover_front': 'story_cover', // Genérico, pode ser adaptado
        'intro_page': 'story_intro',
        'story_illustration': 'story_illustration',
        'story_text': 'story_text_image',
        'coloring_page': 'coloring_page',
        'special_jack_friends': 'special_page',
        'back_cover': 'story_cover'
    };
    // Adaptação para capa de colorir
    if (pageType === 'cover_front' || pageType === 'back_cover') {
        // Num cenário real, o tipo de livro (história/colorir) seria passado aqui
        // para diferenciar a capa. Por simplicidade, usamos um genérico.
        // Vamos assumir que existe um aiSettingType 'coloring_cover'
        // return isColoring ? 'coloring_cover' : 'story_cover';
    }
    return mapping[pageType] || pageType;
};


module.exports = AdminBookGeneratorService;