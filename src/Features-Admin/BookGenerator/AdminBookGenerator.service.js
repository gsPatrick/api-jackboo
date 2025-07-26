// src/Features-Admin/BookGenerator/AdminBookGenerator.service.js
const { Book, BookVariation, BookContentPage, Character, sequelize } = require('../../models');
const visionService = require('../../OpenAI/services/openai.service');
const leonardoService = require('../../OpenAI/services/leonardo.service');
const { downloadAndSaveImage } = require('../../OpenAI/utils/imageDownloader');
const { Op } = require('sequelize');

const ADMIN_USER_ID = 1;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class AdminBookGeneratorService {

    /**
     * Orquestra a criação completa de um livro oficial.
     * Recebe os IDs dos Elements diretamente do controller.
     */
    static async generateBookPreview(bookType, generationData) {
        const t = await sequelize.transaction();
        let book;
        try {
            // 1. Extrair e validar todos os dados da requisição
            const { characterIds, theme, summary, title, printFormatId, elementId, coverElementId } = generationData;
            
            if (!characterIds || !characterIds.length || !theme || !title || !printFormatId || !elementId || !coverElementId) {
                throw new Error("Dados insuficientes. Todos os campos, incluindo personagens, detalhes da história e estilos de IA, são obrigatórios.");
            }
            if (bookType === 'story' && !summary) {
                throw new Error("O resumo da história é obrigatório para livros de história.");
            }

            // 2. Validar a existência dos personagens
            const characters = await Character.findAll({ where: { id: { [Op.in]: characterIds } } });
            if (characters.length !== characterIds.length) {
                throw new Error('Um ou mais personagens selecionados são inválidos.');
            }
            
            const mainCharacter = characters[0];
            const pageCountConfig = { story: 22, coloring: 12 }; // Total de páginas (capas + miolo)
            
            // 3. Criar os registros iniciais do livro e suas associações no banco de dados
            book = await Book.create({
                authorId: ADMIN_USER_ID,
                mainCharacterId: mainCharacter.id,
                title,
                printFormatId,
                status: 'gerando',
                genre: theme,
                storyPrompt: { theme, summary }
            }, { transaction: t });

            await book.setCharacters(characters, { transaction: t });

            const bookVariation = await BookVariation.create({
                bookId: book.id,
                type: bookType === 'coloring' ? 'colorir' : 'historia',
                format: 'digital_pdf',
                price: 0.00,
                coverUrl: '/placeholders/generating_cover.png',
                pageCount: pageCountConfig[bookType],
            }, { transaction: t });
            
            await t.commit();

            // 4. Iniciar o processo de geração de imagens e texto em segundo plano
            (async () => {
                if (bookType === 'coloring') {
                    await this.generateColoringBookContent(book, characters, elementId, coverElementId);
                } else if (bookType === 'story') {
                    await this.generateStoryBookContent(book, characters, summary, elementId, coverElementId);
                }
                await book.update({ status: 'privado' });
                console.log(`[AdminGenerator] Livro ID ${book.id} ("${book.title}") gerado COM SUCESSO!`);
            })().catch(async (error) => {
                console.error(`[AdminGenerator] Erro fatal na geração assíncrona do livro ID ${book.id}:`, error.message);
                await book.update({ status: 'falha_geracao' });
            });

            return book; // Retorna o registro do livro imediatamente
        } catch (error) {
            await t.rollback();
            console.error("[AdminGenerator] Erro ao iniciar a criação do livro:", error.message);
            throw error;
        }
    }

    /**
     * Gera o conteúdo completo de um livro de colorir (capas e miolo).
     */
    static async generateColoringBookContent(book, characters, elementId, coverElementId) {
        const bookVariation = (await this.findBookById(book.id)).variations[0];
        const innerPageCount = 10;
        const characterNames = characters.map(c => c.name).join(' e ');

        // 1. Gerar Capa Frontal
        const coverPrompt = `Capa de livro de colorir com o título "${book.title}", apresentando ${characterNames}. Arte de linha clara e convidativa, fundo branco, estilo de ilustração infantil.`;
        const localCoverUrl = await this.generateAndDownloadImage(coverPrompt, coverElementId, 'illustration');
        await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: 1, pageType: 'cover_front', imageUrl: localCoverUrl, status: 'completed' });
        await bookVariation.update({ coverUrl: localCoverUrl });

        // 2. Gerar roteiro e páginas do miolo
        const pagePrompts = await visionService.generateColoringBookStoryline(characters, book.genre, innerPageCount);
        for (let i = 0; i < pagePrompts.length; i++) {
            const pageNumber = i + 2;
            const finalPrompt = `página de livro de colorir, arte de linha, ${pagePrompts[i]}, linhas limpas, fundo branco`;
            const localPageUrl = await this.generateAndDownloadImage(finalPrompt, elementId, 'coloring');
            await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber, pageType: 'coloring_page', imageUrl: localPageUrl, status: 'completed' });
        }

        // 3. Gerar Contracapa
        const backCoverPrompt = `Contracapa de livro de colorir. Um design simples e limpo com um pequeno ícone ou padrão relacionado ao tema de "${book.genre}".`;
        const localBackCoverUrl = await this.generateAndDownloadImage(backCoverPrompt, coverElementId, 'illustration');
        await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: bookVariation.pageCount, pageType: 'cover_back', imageUrl: localBackCoverUrl, status: 'completed' });
    }

    /**
     * Gera o conteúdo completo de um livro de história (capas, ilustrações e textos).
     */
    static async generateStoryBookContent(book, characters, summary, elementId, coverElementId) {
        const bookVariation = (await this.findBookById(book.id)).variations[0];
        const sceneCount = 10;
        const characterNames = characters.map(c => c.name).join(' e ');

        // 1. Gerar Capa Frontal
        const coverPrompt = `Capa de livro de história infantil com o título "${book.title}", apresentando os personagens: ${characterNames}. Ilustração rica e colorida, mostrando uma cena chave da aventura.`;
        const localCoverUrl = await this.generateAndDownloadImage(coverPrompt, coverElementId, 'illustration');
        await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: 1, pageType: 'cover_front', imageUrl: localCoverUrl, status: 'completed' });
        await bookVariation.update({ coverUrl: localCoverUrl });
        
        // 2. Gerar roteiro e páginas do miolo
        const storyPages = await visionService.generateStoryBookStoryline(characters, book.genre, summary, sceneCount);
        let currentPageNumber = 2;
        for (const scene of storyPages) {
            const illustrationUrl = await this.generateAndDownloadImage(scene.illustration_prompt, elementId, 'illustration');
            await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: currentPageNumber++, pageType: 'illustration', imageUrl: illustrationUrl, status: 'completed' });
            await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: currentPageNumber++, pageType: 'text', content: scene.page_text, status: 'completed' });
        }

        // 3. Gerar Contracapa
        const backCoverPrompt = `Contracapa de livro de história. Um design elegante com um pequeno resumo da história ou uma imagem de um dos personagens (${characters[0].name}) acenando adeus.`;
        const localBackCoverUrl = await this.generateAndDownloadImage(backCoverPrompt, coverElementId, 'illustration');
        await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: bookVariation.pageCount, pageType: 'cover_back', imageUrl: localBackCoverUrl, status: 'completed' });
    }

    /**
     * Função auxiliar para gerar uma imagem no Leonardo, aguardar o resultado e salvar localmente.
     */
    static async generateAndDownloadImage(prompt, elementId, type) {
        const MAX_RETRIES = 3;
        for (let i = 0; i < MAX_RETRIES; i++) {
            try {
                const generationId = type === 'coloring'
                    ? await leonardoService.startColoringPageGeneration(prompt, elementId)
                    : await leonardoService.startStoryIllustrationGeneration(prompt, elementId);

                let finalImageUrl = null;
                const MAX_POLLS = 30; // ~2.5 minutos de espera
                for (let poll = 0; poll < MAX_POLLS; poll++) {
                    await sleep(5000);
                    const result = await leonardoService.checkGenerationStatus(generationId);
                    if (result.isComplete) {
                        finalImageUrl = result.imageUrl;
                        break;
                    }
                }
                if (!finalImageUrl) {
                    throw new Error('Timeout esperando a imagem do Leonardo.AI.');
                }
                
                return await downloadAndSaveImage(finalImageUrl, 'book-pages');
            } catch (error) {
                console.error(`Tentativa ${i + 1} de gerar imagem falhou: ${error.message}`);
                if (i === MAX_RETRIES - 1) throw error; // Lança o erro na última tentativa
            }
        }
    }

    /**
     * Busca um livro pelo seu ID com todas as associações necessárias.
     */
    static async findBookById(bookId) {
        const book = await Book.findByPk(bookId, {
            include: [
                { model: Character, as: 'mainCharacter' },
                {
                    model: BookVariation,
                    as: 'variations',
                    include: [{ model: BookContentPage, as: 'pages' }]
                }
            ],
            order: [[{ model: BookVariation, as: 'variations' }, { model: BookContentPage, as: 'pages' }, 'pageNumber', 'ASC']]
        });
        if (!book) throw new Error('Livro não encontrado.');
        return book;
    }
}

module.exports = new AdminBookGeneratorService;