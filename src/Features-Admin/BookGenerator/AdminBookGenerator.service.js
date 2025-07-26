// src/Features-Admin/BookGenerator/AdminBookGenerator.service.js
const { Book, BookVariation, BookContentPage, Character, sequelize } = require('../../models');
const visionService = require('../../OpenAI/services/openai.service');
const leonardoService = require('../../OpenAI/services/leonardo.service');
const { downloadAndSaveImage } = require('../../OpenAI/utils/imageDownloader');
const { Op } = require('sequelize');

const ADMIN_USER_ID = 1;
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class AdminBookGeneratorService {

    async generateBookPreview(bookType, generationData) {
        const t = await sequelize.transaction();
        let book;
        try {
            const { characterIds, theme, summary, title, printFormatId, elementId, coverElementId } = generationData;
            
            if (!characterIds?.length || !theme || !title || !printFormatId || !elementId || !coverElementId) {
                throw new Error("Dados insuficientes. Todos os campos, incluindo estilos de IA, são obrigatórios.");
            }
            if (bookType === 'story' && !summary) {
                throw new Error("O resumo da história é obrigatório.");
            }

            const characters = await Character.findAll({ where: { id: { [Op.in]: characterIds } } });
            if (characters.length !== characterIds.length) {
                throw new Error('Um ou mais personagens são inválidos.');
            }
            
            const mainCharacter = characters[0];
            const pageCountConfig = { story: 22, coloring: 12 };
            
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

            await BookVariation.create({
                bookId: book.id,
                type: bookType === 'coloring' ? 'colorir' : 'historia',
                format: 'digital_pdf',
                price: 0.00,
                coverUrl: '/placeholders/generating_cover.png',
                pageCount: pageCountConfig[bookType],
            }, { transaction: t });
            
            await t.commit();

            // --- CORREÇÃO CRÍTICA AQUI ---
            // A lógica de geração assíncrona agora está encapsulada corretamente
            // para garantir que o status seja atualizado no final.
            (async () => {
                try {
                    console.log(`[AdminGenerator] Iniciando geração em segundo plano para o livro ID ${book.id}...`);
                    if (bookType === 'coloring') {
                        await this.generateColoringBookContent(book, characters, elementId, coverElementId);
                    } else if (bookType === 'story') {
                        await this.generateStoryBookContent(book, characters, summary, elementId, coverElementId);
                    }
                    
                    // Se tudo correu bem, atualiza o status para 'privado'
                    await book.update({ status: 'privado' });
                    console.log(`[AdminGenerator] Livro ID ${book.id} ("${book.title}") gerado COM SUCESSO! Status atualizado para 'privado'.`);

                } catch (error) {
                    // Se qualquer etapa da geração falhar, captura o erro e atualiza o status
                    console.error(`[AdminGenerator] Erro fatal na geração assíncrona do livro ID ${book.id}:`, error.message);
                    await book.update({ status: 'falha_geracao' });
                }
            })();

            return book;
        } catch (error) {
            await t.rollback();
            console.error("[AdminGenerator] Erro ao iniciar a criação do livro:", error.message);
            throw error;
        }
    }

    async generateColoringBookContent(book, characters, elementId, coverElementId) {
        const bookVariation = (await this.findBookById(book.id)).variations[0];
        const innerPageCount = 10;
        const characterNames = characters.map(c => c.name).join(' e ');

        const coverPrompt = `Capa de livro de colorir com o título "${book.title}", apresentando ${characterNames}. Arte de linha clara e convidativa, fundo branco, estilo de ilustração infantil.`;
        const localCoverUrl = await this.generateAndDownloadImage(coverPrompt, coverElementId, 'illustration');
        await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: 1, pageType: 'cover_front', imageUrl: localCoverUrl, status: 'completed' });
        await bookVariation.update({ coverUrl: localCoverUrl });

        const pagePrompts = await visionService.generateColoringBookStoryline(characters, book.genre, innerPageCount);
        for (let i = 0; i < pagePrompts.length; i++) {
            const pageNumber = i + 2;
            const finalPrompt = `página de livro de colorir, arte de linha, ${pagePrompts[i]}, linhas limpas, fundo branco`;
            const localPageUrl = await this.generateAndDownloadImage(finalPrompt, elementId, 'coloring');
            await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber, pageType: 'coloring_page', imageUrl: localPageUrl, status: 'completed' });
        }

        const backCoverPrompt = `Contracapa de livro de colorir. Um design simples e limpo com um pequeno ícone ou padrão relacionado ao tema de "${book.genre}".`;
        const localBackCoverUrl = await this.generateAndDownloadImage(backCoverPrompt, coverElementId, 'illustration');
        await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: bookVariation.pageCount, pageType: 'cover_back', imageUrl: localBackCoverUrl, status: 'completed' });
    }

    async generateStoryBookContent(book, characters, summary, elementId, coverElementId) {
        const bookVariation = (await this.findBookById(book.id)).variations[0];
        const sceneCount = 10;
        const characterNames = characters.map(c => c.name).join(' e ');

        const coverPrompt = `Capa de livro de história infantil com o título "${book.title}", apresentando os personagens: ${characterNames}. Ilustração rica e colorida, mostrando uma cena chave da aventura.`;
        const localCoverUrl = await this.generateAndDownloadImage(coverPrompt, coverElementId, 'illustration');
        await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: 1, pageType: 'cover_front', imageUrl: localCoverUrl, status: 'completed' });
        await bookVariation.update({ coverUrl: localCoverUrl });
        
        const storyPages = await visionService.generateStoryBookStoryline(characters, book.genre, summary, sceneCount);
        let currentPageNumber = 2;
        for (const scene of storyPages) {
            const illustrationUrl = await this.generateAndDownloadImage(scene.illustration_prompt, elementId, 'illustration');
            await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: currentPageNumber++, pageType: 'illustration', imageUrl: illustrationUrl, status: 'completed' });
            await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: currentPageNumber++, pageType: 'text', content: scene.page_text, status: 'completed' });
        }

        const backCoverPrompt = `Contracapa de livro de história. Um design elegante com uma imagem de um dos personagens (${characters[0].name}) acenando adeus.`;
        const localBackCoverUrl = await this.generateAndDownloadImage(backCoverPrompt, coverElementId, 'illustration');
        await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: bookVariation.pageCount, pageType: 'cover_back', imageUrl: localBackCoverUrl, status: 'completed' });
    }

    async generateAndDownloadImage(prompt, elementId, type) {
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