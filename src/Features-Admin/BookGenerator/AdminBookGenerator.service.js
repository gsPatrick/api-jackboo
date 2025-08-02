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
            // ✅ Agora os ElementIDs vêm diretamente do formulário e são usados sem intermediários.
            const { characterIds, theme, summary, title, printFormatId, elementId, coverElementId, pageCount } = generationData;
            
            console.log(`[AdminGenerator] Recebido pedido para gerar livro. Miolo Element ID: ${elementId}, Capa Element ID: ${coverElementId}`);

            if (!characterIds?.length || !theme || !title || !printFormatId || !elementId || !coverElementId) {
                throw new Error("Dados insuficientes. Todos os campos, incluindo os Elements de IA, são obrigatórios.");
            }
            if (bookType === 'story' && !summary) {
                throw new Error("O resumo da história é obrigatório.");
            }
            if (!pageCount || pageCount <= 0) {
                throw new Error("A contagem de páginas é inválida.");
            }

            const characters = await Character.findAll({ where: { id: { [Op.in]: characterIds } } });
            if (characters.length !== characterIds.length) throw new Error('Um ou mais personagens são inválidos.');
            
            const mainCharacter = characters[0];
            const totalPages = bookType === 'historia' ? (pageCount * 2) + 2 : pageCount + 2;

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
                type: bookType === 'colorir' ? 'colorir' : 'historia',
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
                        await this.generateColoringBookContent(book, characters, elementId, coverElementId, pageCount);
                    } else if (bookType === 'historia') {
                        await this.generateStoryBookContent(book, characters, summary, elementId, coverElementId, pageCount);
                    }
                    
                    await book.update({ status: 'privado' });
                    console.log(`[AdminGenerator] Livro ID ${book.id} ("${book.title}") gerado COM SUCESSO! Status atualizado para 'privado'.`);

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

    async generateColoringBookContent(book, characters, elementId, coverElementId, innerPageCount) {
        const bookVariation = (await this.findBookById(book.id)).variations[0];
        const characterNames = characters.map(c => c.name).join(' e ');
        const totalPages = innerPageCount + 2;

        console.log(`[AdminGenerator] Livro ${book.id}: Gerando roteiro para ${innerPageCount} páginas de colorir...`);
        const pagePrompts = await visionService.generateColoringBookStoryline(characters, book.genre, innerPageCount);

        if (!pagePrompts || pagePrompts.length === 0) {
            throw new Error("A IA (GPT) não retornou nenhum prompt para as páginas de colorir.");
        }

        console.log(`[AdminGenerator] Livro ${book.id}: Gerando capa...`);
        const coverPrompt = `A colorful, 2D digital illustration for the cover of a children's book featuring Jackboo, an anthropomorphic character with a large head, round face, expressive eyes, and white fur. Jackboo is standing in a vibrant scene that reflects a theme to be defined separately (e.g., construction site, zoo, space, school, beach, etc.). The background must clearly depict the chosen theme with playful, imaginative, and immersive elements.

Jackboo should be the only character present on the cover, unless a second character (created by the user) is provided — in that case, place both characters with similar proportions and in harmony within the scene. Both characters should appear happy and engaging, interacting naturally with the environment.

The illustration must resemble a professionally illustrated children’s book cover, with soft lighting and a slightly satin finish — the texture should evoke the look of high-quality printed children's books. The style must be vivid, warm, and joyful, with painterly details and rich colors.

The title "Jackboo" must appear at the top center of the image, in colorful, rounded letters that are playful and friendly. The size of the title should be approximately **one-third** the vertical height of the entire image — large enough to be eye-catching, but not overpowering the visual scene.

The overall composition should feel balanced and fun, with Jackboo clearly in the foreground and the theme-based elements integrated into the environment behind him. The final image should simulate a complete, fully designed book cover ready for printing.`;
        const localCoverUrl = await this.generateAndDownloadImage(coverPrompt, coverElementId, 'illustration');
        await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: 1, pageType: 'cover_front', imageUrl: localCoverUrl, status: 'completed' });
        await bookVariation.update({ coverUrl: localCoverUrl });
        
        console.log(`[AdminGenerator] Livro ${book.id}: Gerando ${pagePrompts.length} páginas do miolo...`);
        for (let i = 0; i < pagePrompts.length; i++) {
            const pageNumber = i + 2;
            const finalPrompt = `coloring book page, clean line art, simple shapes, white background, ${pagePrompts[i]}`;
            const localPageUrl = await this.generateAndDownloadImage(finalPrompt, elementId, 'coloring');
            await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber, pageType: 'coloring_page', imageUrl: localPageUrl, status: 'completed' });
        }

        console.log(`[AdminGenerator] Livro ${book.id}: Gerando contracapa...`);
        const backCoverPrompt = `✅ Diretrizes da CONTRACAPA:
	•	A contracapa não deve conter personagens.
	•	Deve trazer uma nova cena, também relacionada ao mesmo tema da capa, mas diferente da cena da frente (ex: se a capa mostra o Jackboo na praia, a contracapa pode mostrar o mar, a areia com brinquedos, etc.).
	•	O estilo visual deve ser exatamente o mesmo da capa: 2D vetorial, suave e limpo, com acabamento fosco-acetinado.
	•	Incluir apenas o nome “Jackboo” bem pequeno no canto inferior direito da contracapa, sem nenhum outro texto ou enfeite.".`;
        const localBackCoverUrl = await this.generateAndDownloadImage(backCoverPrompt, coverElementId, 'illustration');
        await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: totalPages, pageType: 'cover_back', imageUrl: localBackCoverUrl, status: 'completed' });
    }

    async generateStoryBookContent(book, characters, summary, elementId, coverElementId, sceneCount) {
        const bookVariation = (await this.findBookById(book.id)).variations[0];
        const characterNames = characters.map(c => c.name).join(' e ');
        const totalPages = (sceneCount * 2) + 2;

        console.log(`[AdminGenerator] Livro ${book.id}: Gerando roteiro para ${sceneCount} cenas...`);
        const storyPages = await visionService.generateStoryBookStoryline(characters, book.genre, summary, sceneCount);

        if (!storyPages || storyPages.length === 0) {
            throw new Error("A IA (GPT) não retornou nenhuma cena para a história.");
        }

        console.log(`[AdminGenerator] Livro ${book.id}: Gerando capa...`);
        const coverPrompt = `Capa de livro de história infantil, título "${book.title}", com ${characterNames}. Ilustração colorida.`;
        const localCoverUrl = await this.generateAndDownloadImage(coverPrompt, coverElementId, 'illustration');
        await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: 1, pageType: 'cover_front', imageUrl: localCoverUrl, status: 'completed' });
        await bookVariation.update({ coverUrl: localCoverUrl });
        
        console.log(`[AdminGenerator] Livro ${book.id}: Gerando ${storyPages.length} cenas do miolo...`);
        let currentPageNumber = 2;
        for (const scene of storyPages) {
            const illustrationUrl = await this.generateAndDownloadImage(scene.illustration_prompt, elementId, 'illustration');
            await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: currentPageNumber++, pageType: 'illustration', imageUrl: illustrationUrl, status: 'completed' });
            await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: currentPageNumber++, pageType: 'text', content: scene.page_text, status: 'completed' });
        }

        console.log(`[AdminGenerator] Livro ${book.id}: Gerando contracapa...`);
        const backCoverPrompt = `✅ Diretrizes da CONTRACAPA:
	•	A contracapa não deve conter personagens.
	•	Deve trazer uma nova cena, também relacionada ao mesmo tema da capa, mas diferente da cena da frente (ex: se a capa mostra o Jackboo na praia, a contracapa pode mostrar o mar, a areia com brinquedos, etc.).
	•	O estilo visual deve ser exatamente o mesmo da capa: 2D vetorial, suave e limpo, com acabamento fosco-acetinado.
	•	Incluir apenas o nome “Jackboo” bem pequeno no canto inferior direito da contracapa, sem nenhum outro texto ou enfeite.".`;
        const localBackCoverUrl = await this.generateAndDownloadImage(backCoverPrompt, coverElementId, 'illustration');
        await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: totalPages, pageType: 'cover_back', imageUrl: localBackCoverUrl, status: 'completed' });
    }

    async generateAndDownloadImage(prompt, elementId, type) {
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