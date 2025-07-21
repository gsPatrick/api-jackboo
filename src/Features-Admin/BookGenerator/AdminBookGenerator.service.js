// src/Features-Admin/BookGenerator/AdminBookGenerator.service.js
const { Book, BookVariation, BookContentPage, Character, sequelize } = require('../../models');
const visionService = require('../../OpenAI/services/openai.service');
const leonardoService = require('../../OpenAI/services/leonardo.service');
const { downloadAndSaveImage } = require('../../OpenAI/utils/imageDownloader');

const ADMIN_USER_ID = 1;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class AdminBookGeneratorService {

    /**
     * Ponto de entrada para a criação de livros pelo admin.
     * O processo agora é síncrono: a função só retorna após a conclusão de todas as etapas.
     * @param {string} bookType - 'coloring' ou 'story'.
     * @param {object} generationData - Dados do formulário do admin.
     * @returns {Book} O objeto do livro recém-criado.
     */
    static async generateBookPreview(bookType, generationData) {
        const { theme, title, characterId, printFormatId, pageCount, location, summary } = generationData;

        if (!bookType || !title || !characterId || !printFormatId || !pageCount || !theme) {
            throw new Error("Dados insuficientes fornecidos para a geração do livro.");
        }
        
        const character = await Character.findByPk(characterId);
        if (!character) throw new Error("Personagem principal não encontrado.");

        let book;
        const t = await sequelize.transaction();
        try {
            book = await Book.create({
                authorId: ADMIN_USER_ID,
                title,
                mainCharacterId: characterId,
                printFormatId,
                status: 'gerando',
                genre: theme,
                storyPrompt: { theme, location, summary }
            }, { transaction: t });

            let dbBookType = bookType === 'coloring' ? 'colorir' : 'historia';
            if (!['colorir', 'historia'].includes(dbBookType)) {
                throw new Error(`Tipo de livro desconhecido: ${bookType}`);
            }

            await BookVariation.create({
                bookId: book.id,
                type: dbBookType,
                format: 'digital_pdf',
                price: 0.00,
                coverUrl: character.generatedCharacterUrl,
                pageCount: parseInt(pageCount),
            }, { transaction: t });

            await t.commit();
        } catch (error) {
            await t.rollback();
            console.error("[AdminGenerator] Erro ao criar a estrutura do livro no DB:", error);
            throw new Error("Falha ao criar os registros iniciais do livro.");
        }

        // --- GERAÇÃO SÍNCRONA ---
        try {
            console.log(`[AdminGenerator] INICIANDO geração síncrona para o Livro ID: ${book.id}`);
            
            const fullBook = await this.findBookById(book.id); 

            if (bookType === 'coloring') {
                await this.generateColoringBookContent(fullBook);
            } else if (bookType === 'story') {
                throw new Error("A geração de livros de história ainda não foi implementada.");
            }

            await book.update({ status: 'privado' });
            console.log(`[AdminGenerator] Livro ID ${book.id} gerado COM SUCESSO!`);

        } catch (error) {
            console.error(`[AdminGenerator] Erro fatal durante a geração do livro ID ${book.id}:`, error.message);
            await book.update({ status: 'falha_geracao' });
            throw error; 
        }

        return book;
    }

    /**
     * Lógica específica para gerar o conteúdo de um livro de colorir.
     * @param {Book} book - A instância completa do livro com suas associações.
     */
    static async generateColoringBookContent(book) {
        const bookVariation = book.variations[0];
        const character = book.mainCharacter;
        const pageCount = bookVariation.pageCount;
        const theme = book.genre;

        // 1. Obter a descrição visual do personagem
        console.log(`[AdminGenerator] Obtendo descrição visual para o personagem ${character.name}...`);
        const characterImageUrl = `${process.env.APP_URL}${character.generatedCharacterUrl}`;
        let characterDescription = 'Um personagem fofo e amigável.'; // Descrição fallback
        try {
            const fetchedDescription = await visionService.describeImage(characterImageUrl);
            if (fetchedDescription && !fetchedDescription.toLowerCase().includes("i'm sorry")) {
                // Limpa a descrição para ser usada nos prompts
                characterDescription = fetchedDescription.replace(/\n/g, ' ').replace(/-/g, '').trim();
            }
        } catch (descError) {
            console.warn(`[AdminGenerator] AVISO: Falha ao obter descrição visual. Usando descrição padrão. Erro: ${descError.message}`);
        }

        // 2. Gerar o roteiro com a descrição
        console.log(`[AdminGenerator] Gerando roteiro para ${pageCount} páginas sobre "${theme}"...`);
        const pagePrompts = await visionService.generateColoringBookStoryline(
            character.name,
            characterDescription,
            theme,
            pageCount
        );

        // Validação de robustez
        if (!pagePrompts || pagePrompts.length === 0) {
            throw new Error('A IA não conseguiu gerar o roteiro. O array de prompts de página está vazio.');
        }

        console.log(`[AdminGenerator] Roteiro com ${pagePrompts.length} páginas recebido. Iniciando geração das imagens...`);

        // 3. Criar um array de promessas, passando a descrição para cada geração de página
        const pageGenerationPromises = pagePrompts.map((prompt, index) => {
            const pageNumber = index + 1;
            return this.generateSingleColoringPage(bookVariation.id, pageNumber, prompt, characterDescription);
        });

        // 4. Espera todas as páginas serem geradas
        await Promise.all(pageGenerationPromises);
        console.log(`[AdminGenerator] Todas as ${pageCount} páginas do livro ${book.id} foram processadas.`);
    }
    
    /**
     * Função auxiliar que encapsula a lógica de geração de uma única página.
     * @param {number} bookVariationId 
     * @param {number} pageNumber 
     * @param {string} prompt 
     * @param {string} characterDescription 
     */
    static async generateSingleColoringPage(bookVariationId, pageNumber, prompt, characterDescription) {
        console.log(`[AdminGenerator] Preparando para gerar a página ${pageNumber}: ${prompt}`);
        
        // 1. Cria o registro da página no banco com status 'generating'
        let pageRecord = await BookContentPage.create({
            bookVariationId,
            pageNumber,
            pageType: 'coloring_page',
            illustrationPrompt: prompt,
            status: 'generating',
        }).catch(err => {
            console.error(`[AdminGenerator] Falha crítica ao criar o registro inicial da página ${pageNumber}:`, err.message);
            return null; 
        });

        if (!pageRecord) return; // Aborta se a criação do registro falhou

        try {
            // 2. Inicia a geração da imagem na API externa, passando a descrição
            const generationId = await leonardoService.startColoringPageGeneration(prompt, characterDescription);

            // 3. Aguarda o resultado (Polling)
            let finalImageUrl = null;
            const MAX_POLLS = 30;
            for (let poll = 0; poll < MAX_POLLS; poll++) {
                await sleep(5000); // 5 segundos de espera
                const result = await leonardoService.checkGenerationStatus(generationId);
                if (result.isComplete) {
                    finalImageUrl = result.imageUrl;
                    break;
                }
            }

            if (!finalImageUrl) {
                throw new Error(`Timeout ao gerar a imagem da página ${pageNumber}.`);
            }

            // 4. Baixa a imagem e atualiza o registro para 'completed'
            const localPageUrl = await downloadAndSaveImage(finalImageUrl, 'book-pages');

            await pageRecord.update({
                imageUrl: localPageUrl,
                status: 'completed',
            });
            console.log(`[AdminGenerator] Página ${pageNumber} concluída com sucesso.`);

        } catch (pageError) {
            console.error(`[AdminGenerator] Erro ao gerar a página ${pageNumber}:`, pageError.message);
            // 5. Em caso de erro, atualiza o registro para 'failed'
            await pageRecord.update({
                status: 'failed',
                errorDetails: pageError.message,
            });
        }
    }

    /**
     * Função para buscar um livro completo por ID, usada internamente e pelo controller de preview.
     */
    static async findBookById(bookId) {
        const book = await Book.findByPk(bookId, {
            include: [
                { model: Character, as: 'mainCharacter' },
                {
                    model: BookVariation,
                    as: 'variations',
                    include: [{
                        model: BookContentPage,
                        as: 'pages',
                    }]
                }
            ],
            order: [
                [{ model: BookVariation, as: 'variations' }, { model: BookContentPage, as: 'pages' }, 'pageNumber', 'ASC']
            ]
        });
        if (!book) throw new Error('Livro não encontrado.');
        return book;
    }
}

module.exports = AdminBookGeneratorService;