// src/Features-Admin/BookGenerator/AdminBookGenerator.service.js
const { Book, BookVariation, BookContentPage, Character, sequelize } = require('../../models');
const visionService = require('../../OpenAI/services/openai.service');
const leonardoService = require('../../OpenAI/services/leonardo.service');
const { downloadAndSaveImage } = require('../../OpenAI/utils/imageDownloader');
const prompts = require('../../OpenAI/config/AIPrompts');
const TextToImageService = require('../../Utils/TextToImageService'); // Importa o serviço de Texto para Imagem
const { Op } = require('sequelize');

const ADMIN_USER_ID = 1;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class AdminBookGeneratorService {

    async generateBookPreview(bookType, generationData) {
        const t = await sequelize.transaction();
        let book;
        try {
            const { characterIds, theme, summary, title, printFormatId, elementId, coverElementId, pageCount } = generationData;
            
            console.log(`[AdminGenerator] Recebido pedido para gerar livro. Miolo Element ID: ${elementId}, Capa Element ID: ${coverElementId}`);

            if (!characterIds?.length || !theme || !title || !printFormatId || !elementId || !coverElementId) {
                throw new Error("Dados insuficientes. Todos os campos, incluindo os Elements de IA, são obrigatórios.");
            }
            if (bookType === 'historia' && !summary) {
                throw new Error("O resumo da história é obrigatório.");
            }
            if (!pageCount || pageCount <= 0) {
                throw new Error("A contagem de páginas é inválida.");
            }

            const characters = await Character.findAll({ where: { id: { [Op.in]: characterIds } } });
            if (characters.length !== characterIds.length) throw new Error('Um ou mais personagens são inválidos.');
            
            const mainCharacter = characters[0];
            const innerPageCount = parseInt(pageCount, 10);
            const totalPages = bookType === 'historia' ? (innerPageCount * 2) + 2 : innerPageCount + 2;

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
                type: bookType,
                format: 'digital_pdf',
                price: 0.00,
                coverUrl: '/placeholders/generating_cover.png',
                pageCount: totalPages,
            }, { transaction: t });
            
            await t.commit();

            (async () => {
                try {
                    console.log(`[AdminGenerator] Iniciando geração em segundo plano para o livro ID ${book.id}...`);
                    if (bookType === 'colorir') {
                        await this.generateColoringBookContent(book, bookVariation, characters, elementId, coverElementId, innerPageCount);
                    } else if (bookType === 'historia') {
                        await this.generateStoryBookContent(book, bookVariation, characters, summary, elementId, coverElementId, innerPageCount);
                    }
                    
                    await book.update({ status: 'publicado' });
                    console.log(`[AdminGenerator] Livro ID ${book.id} ("${book.title}") gerado e PUBLICADO COM SUCESSO!`);

                } catch (error) {
                    console.error(`[AdminGenerator] Erro fatal na geração assíncrona do livro ID ${book.id}:`, error.message);
                    await book.update({ status: 'falha_geracao' });
                }
            })();

            return book;
        } catch (error) {
            await t.rollback();
            console.error("[AdminGenerator] Erro ao iniciar a criação do livro:", error);
            throw error;
        }
    }

    async generateColoringBookContent(book, bookVariation, characters, elementId, coverElementId, innerPageCount) {
        const totalPages = innerPageCount + 2;

        console.log(`[AdminGenerator] Livro ${book.id}: Gerando roteiro para ${innerPageCount} páginas de colorir...`);
        const pagePrompts = await visionService.generateColoringBookStoryline(characters, book.genre, innerPageCount);

        if (!pagePrompts || pagePrompts.length === 0) {
            throw new Error("A IA (GPT) não retornou nenhum prompt para as páginas de colorir.");
        }

        console.log(`[AdminGenerator] Livro ${book.id}: Gerando capa...`);
        const coverGptDescription = await visionService.generateCoverDescription(book.title, book.genre, characters);
        const finalCoverPrompt = prompts.LEONARDO_STORY_ILLUSTRATION_PROMPT_BASE.replace('{{GPT_OUTPUT}}', `day time, cheerful scene, ${coverGptDescription}`);
        const localCoverUrl = await this.generateAndDownloadImage(finalCoverPrompt, coverElementId, 'illustration');
        await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: 1, pageType: 'cover_front', imageUrl: localCoverUrl, status: 'completed' });
        await bookVariation.update({ coverUrl: localCoverUrl });
        
        console.log(`[AdminGenerator] Livro ${book.id}: Gerando ${pagePrompts.length} páginas do miolo...`);
        for (let i = 0; i < pagePrompts.length; i++) {
            const pageNumber = i + 2;
            const finalPrompt = prompts.LEONARDO_COLORING_PAGE_PROMPT_BASE.replace('{{GPT_OUTPUT}}', pagePrompts[i]);
            const localPageUrl = await this.generateAndDownloadImage(finalPrompt, elementId, 'coloring');
            await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber, pageType: 'coloring_page', imageUrl: localPageUrl, status: 'completed' });
        }

        console.log(`[AdminGenerator] Livro ${book.id}: Gerando contracapa...`);
        const finalBackCoverPrompt = prompts.LEONARDO_STORY_ILLUSTRATION_PROMPT_BASE.replace('{{GPT_OUTPUT}}', `night time, starry sky, peaceful scene, ${coverGptDescription}`);
        const localBackCoverUrl = await this.generateAndDownloadImage(finalBackCoverPrompt, coverElementId, 'illustration');
        await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: totalPages, pageType: 'cover_back', imageUrl: localBackCoverUrl, status: 'completed' });
    }

    async generateStoryBookContent(book, bookVariation, characters, summary, elementId, coverElementId, sceneCount) {
        const totalPages = (sceneCount * 2) + 2;

        console.log(`[AdminGenerator] Livro ${book.id}: Gerando roteiro para ${sceneCount} cenas...`);
        const storyPages = await visionService.generateStoryBookStoryline(characters, book.genre, summary, sceneCount);

        if (!storyPages || storyPages.length === 0) {
            throw new Error("A IA (GPT) não retornou nenhuma cena para a história.");
        }

        console.log(`[AdminGenerator] Livro ${book.id}: Gerando capa...`);
        const coverGptDescription = await visionService.generateCoverDescription(book.title, book.genre, characters);
        const finalCoverPrompt = prompts.LEONARDO_STORY_ILLUSTRATION_PROMPT_BASE.replace('{{GPT_OUTPUT}}', `day time, cheerful scene, ${coverGptDescription}`);
        const localCoverUrl = await this.generateAndDownloadImage(finalCoverPrompt, coverElementId, 'illustration');
        await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: 1, pageType: 'cover_front', imageUrl: localCoverUrl, status: 'completed' });
        await bookVariation.update({ coverUrl: localCoverUrl });
        
        console.log(`[AdminGenerator] Livro ${book.id}: Gerando ${storyPages.length} cenas do miolo...`);
        let currentPageNumber = 2;
        for (const scene of storyPages) {
            const finalIllustrationPrompt = prompts.LEONARDO_STORY_ILLUSTRATION_PROMPT_BASE.replace('{{GPT_OUTPUT}}', scene.illustration_prompt);
            const illustrationUrl = await this.generateAndDownloadImage(finalIllustrationPrompt, elementId, 'illustration');
            await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: currentPageNumber++, pageType: 'illustration', imageUrl: illustrationUrl, status: 'completed' });
            
            // Gera a página de texto como uma imagem
            const textImageUrl = await TextToImageService.generateImage({ text: scene.page_text });
            await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: currentPageNumber++, pageType: 'text', imageUrl: textImageUrl, content: scene.page_text, status: 'completed' });
        }

        console.log(`[AdminGenerator] Livro ${book.id}: Gerando contracapa...`);
        const finalBackCoverPrompt = prompts.LEONARDO_STORY_ILLUSTRATION_PROMPT_BASE.replace('{{GPT_OUTPUT}}', `night time, starry sky, peaceful scene, ${coverGptDescription}`);
        const localBackCoverUrl = await this.generateAndDownloadImage(finalBackCoverPrompt, coverElementId, 'illustration');
        await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: totalPages, pageType: 'cover_back', imageUrl: localBackCoverUrl, status: 'completed' });
    }

    async generateAndDownloadImage(prompt, elementId, type) {
        if (!elementId) {
            throw new Error(`O Element ID para a geração do tipo '${type}' não foi fornecido.`);
        }

        console.log(`[LeonardoService] Solicitando imagem do tipo '${type}' com element '${elementId}'...`);
        const MAX_RETRIES = 3;
        for (let i = 0; i < MAX_RETRIES; i++) {
            try {
                const generationId = type === 'coloring'
                    ? await leonardoService.startColoringPageGeneration(prompt, elementId)
                    : await leonardoService.startStoryIllustrationGeneration(prompt, elementId);

                let finalImageUrl = null;
                const MAX_POLLS = 30;
                for (let poll = 0; poll < MAX_POLLS; poll++) {
                    await sleep(5000);
                    const result = await leonardoService.checkGenerationStatus(generationId);
                    if (result.isComplete) {
                        finalImageUrl = result.imageUrl;
                        break;
                    }
                }
                if (!finalImageUrl) throw new Error('Timeout esperando a imagem do Leonardo.AI.');
                
                return await downloadAndSaveImage(finalImageUrl, 'book-pages');
            } catch (error) {
                console.error(`Tentativa ${i + 1} de gerar imagem falhou: ${error.message}`);
                if (i === MAX_RETRIES - 1) throw error;
            }
        }
    }

    async findBookById(bookId) {
        const book = await Book.findByPk(bookId, {
            include: [
                { model: Character, as: 'mainCharacter' },
                { model: BookVariation, as: 'variations', include: [{ model: BookContentPage, as: 'pages' }] }
            ],
            order: [[{ model: BookVariation, as: 'variations' }, { model: BookContentPage, as: 'pages' }, 'pageNumber', 'ASC']]
        });
        if (!book) throw new Error('Livro não encontrado.');
        return book;
    }
}

module.exports = new AdminBookGeneratorService();