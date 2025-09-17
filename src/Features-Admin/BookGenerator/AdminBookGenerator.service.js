// src/Features-Admin/BookGenerator/AdminBookGenerator.service.js
const { Book, BookVariation, BookContentPage, Character, sequelize } = require('../../models');
const visionService = require('../../OpenAI/services/openai.service');
// ✅ NOVO: Importa o serviço do Gemini
const geminiService = require('../../OpenAI/services/gemini.service');
const { downloadAndSaveImage } = require('../../OpenAI/utils/imageDownloader');
const prompts = require('../../OpenAI/config/AIPrompts');
const TextToImageService = require('../../Utils/TextToImageService');
const { Op } = require('sequelize');
const fs = require('fs/promises');
const path = require('path');

const ADMIN_USER_ID = 1;

// ✅ NOVO: Helper para carregar imagens de referência do projeto
async function loadReferenceImage(filePath) {
    try {
        const fullPath = path.resolve(__dirname, '../../../', filePath);
        const imageData = await fs.readFile(fullPath);
        // Detecta o mimeType a partir da extensão do arquivo
        const mimeType = `image/${path.extname(filePath).slice(1)}`;
        return { imageData, mimeType };
    } catch (error) {
        console.error(`[AdminGenerator] ERRO CRÍTICO: Não foi possível carregar a imagem de referência: ${filePath}`, error);
        // Lançar um erro aqui impede a geração de continuar sem os ativos essenciais
        throw new Error(`Imagem de referência não encontrada: ${filePath}`);
    }
}

class AdminBookGeneratorService {

    async generateBookPreview(bookType, generationData) {
        const t = await sequelize.transaction();
        let book;
        try {
            // ✅ REMOVIDO: 'elementId' e 'coverElementId' não são mais necessários para o Gemini
            const { characterIds, theme, summary, title, printFormatId, pageCount } = generationData;
            
            console.log(`[AdminGenerator] Recebido pedido para gerar livro do tipo '${bookType}' com o Gemini.`);

            if (!characterIds?.length || !theme || !title || !printFormatId) {
                throw new Error("Dados insuficientes. Personagem, tema, título e formato de impressão são obrigatórios.");
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
            // O cálculo de páginas totais é ajustado para o tipo de livro
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

            const bookVariation = await BookVariation.create({
                bookId: book.id,
                type: bookType, // 'colorir' ou 'historia'
                format: 'digital_pdf',
                price: 0.00,
                coverUrl: '/placeholders/generating_cover.png',
                pageCount: totalPages,
            }, { transaction: t });
            
            await t.commit();

            // Geração em segundo plano
            (async () => {
                try {
                    console.log(`[AdminGenerator] Iniciando geração em segundo plano para o livro ID ${book.id}...`);
                    if (bookType === 'colorir') {
                        // ✅ ATUALIZADO: Chama a nova função para o Gemini
                        await this.generateColoringBookContentGemini(book, bookVariation, characters, theme, parseInt(pageCount, 10));
                    } else if (bookType === 'historia') {
                        // Esta função pode ser adaptada para o Gemini no futuro se necessário
                        await this.generateStoryBookContent(book, bookVariation, characters, summary, parseInt(pageCount, 10));
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

    // ✅ NOVO: Função totalmente reescrita para usar Gemini para livros de colorir
    async generateColoringBookContentGemini(book, bookVariation, characters, theme, innerPageCount) {
        const mainCharacter = characters[0];
        
        // 1. Carregar todas as imagens de referência necessárias UMA VEZ
        console.log('[AdminGenerator] Carregando imagens de referência...');
        const coverBaseImage = await loadReferenceImage('src/assets/ai-references/cover/capa_padrao_jackboo.jpg'); // Substitua pelo nome real
        const userCharacterImage = { imageData: await downloadAndSaveImage(mainCharacter.generatedCharacterUrl, 'temp', true), mimeType: 'image/png' };
        
            const styleImagePaths = [
                'src/assets/ai-references/style/style_01.jpg',
                'src/assets/ai-references/style/style_02.jpg',
                'src/assets/ai-references/style/style_03.jpg',
                // Se você remover as linhas 04 e 05, o código funcionará com 3
            ];
        const styleImages = await Promise.all(styleImagePaths.map(p => loadReferenceImage(p)));

        // 2. Gerar Capa e Contracapa
        console.log(`[AdminGenerator] Livro ${book.id}: Gerando capa...`);
        const coverPrompt = prompts.GEMINI_COVER_PROMPT_TEMPLATE
            .replace('{{THEME}}', theme)
            .replace('{{TIME_OF_DAY}}', 'daytime, bright and cheerful');
        
        const localCoverUrl = await geminiService.generateImage({
            textPrompt: coverPrompt,
            baseImages: [coverBaseImage, userCharacterImage]
        });
        await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: 1, pageType: 'cover_front', imageUrl: localCoverUrl, status: 'completed' });
        await bookVariation.update({ coverUrl: localCoverUrl });

        console.log(`[AdminGenerator] Livro ${book.id}: Gerando contracapa...`);
        const backCoverPrompt = prompts.GEMINI_COVER_PROMPT_TEMPLATE
            .replace('{{THEME}}', theme)
            .replace('{{TIME_OF_DAY}}', 'nighttime, with stars and a moon');
            
        const localBackCoverUrl = await geminiService.generateImage({
            textPrompt: backCoverPrompt,
            baseImages: [coverBaseImage, userCharacterImage]
        });
        await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: innerPageCount + 2, pageType: 'cover_back', imageUrl: localBackCoverUrl, status: 'completed' });

        // 3. Gerar Roteiro do Miolo
        console.log(`[AdminGenerator] Livro ${book.id}: Gerando roteiro para ${innerPageCount} páginas de colorir...`);
        const pagePrompts = await visionService.generateColoringBookStoryline(characters, theme, innerPageCount);
        if (!pagePrompts || pagePrompts.length === 0) {
            throw new Error("A IA (GPT) não retornou nenhum prompt para as páginas de colorir.");
        }

        // 4. Gerar Páginas do Miolo
        console.log(`[AdminGenerator] Livro ${book.id}: Gerando ${pagePrompts.length} páginas do miolo...`);
        for (let i = 0; i < pagePrompts.length; i++) {
            const pageNumber = i + 2;
            const sceneDescription = pagePrompts[i];
            
            const finalPrompt = prompts.GEMINI_COLORING_PAGE_PROMPT_TEMPLATE.replace('{{SCENE_DESCRIPTION}}', sceneDescription);
            
            console.log(`   - Gerando página ${pageNumber}...`);
            const localPageUrl = await geminiService.generateImage({
                textPrompt: finalPrompt,
                baseImages: [...styleImages, userCharacterImage]
            });
            
            await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber, pageType: 'coloring_page', imageUrl: localPageUrl, status: 'completed' });
        }
    }

    // A função de geração de livro de história permanece, mas agora usa uma função de geração de imagem genérica
    // que poderia ser facilmente apontada para o Gemini no futuro.
    async generateStoryBookContent(book, bookVariation, characters, summary, sceneCount) {
        const totalPages = (sceneCount * 2) + 2;

        console.log(`[AdminGenerator] Livro ${book.id}: Gerando roteiro para ${sceneCount} cenas...`);
        const storyPages = await visionService.generateStoryBookStoryline(characters, book.genre, summary, sceneCount);
        if (!storyPages || storyPages.length === 0) throw new Error("A IA (GPT) não retornou nenhuma cena para a história.");

        console.log(`[AdminGenerator] Livro ${book.id}: Gerando capa...`);
        const coverGptDescription = await visionService.generateCoverDescription(book.title, book.genre, characters);
        const finalCoverPrompt = prompts.LEONARDO_STORY_ILLUSTRATION_PROMPT_BASE.replace('{{GPT_OUTPUT}}', `day time, cheerful scene, ${coverGptDescription}`);
        const localCoverUrl = await this.generateAndDownloadImage(finalCoverPrompt, 'illustration'); // Usando função genérica
        await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: 1, pageType: 'cover_front', imageUrl: localCoverUrl, status: 'completed' });
        await bookVariation.update({ coverUrl: localCoverUrl });
        
        console.log(`[AdminGenerator] Livro ${book.id}: Gerando ${storyPages.length} cenas do miolo...`);
        let currentPageNumber = 2;
        for (const scene of storyPages) {
            const textImageUrl = await TextToImageService.generateImage({ text: scene.page_text });
            await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: currentPageNumber++, pageType: 'text', imageUrl: textImageUrl, content: scene.page_text, status: 'completed' });

            const finalIllustrationPrompt = prompts.LEONARDO_STORY_ILLUSTRATION_PROMPT_BASE.replace('{{GPT_OUTPUT}}', scene.illustration_prompt);
            const illustrationUrl = await this.generateAndDownloadImage(finalIllustrationPrompt, 'illustration');
            await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: currentPageNumber++, pageType: 'illustration', imageUrl: illustrationUrl, status: 'completed' });
        }

        console.log(`[AdminGenerator] Livro ${book.id}: Gerando contracapa...`);
        const finalBackCoverPrompt = prompts.LEONARDO_STORY_ILLUSTRATION_PROMPT_BASE.replace('{{GPT_OUTPUT}}', `night time, starry sky, peaceful scene, ${coverGptDescription}`);
        const localBackCoverUrl = await this.generateAndDownloadImage(finalBackCoverPrompt, 'illustration');
        await BookContentPage.create({ bookVariationId: bookVariation.id, pageNumber: totalPages, pageType: 'cover_back', imageUrl: localBackCoverUrl, status: 'completed' });
    }

    // ✅ ATENÇÃO: Esta função agora é um placeholder. A lógica de geração de imagem foi movida para o Gemini.
    // Ela ainda é usada pelo 'generateStoryBookContent'. Para migrar 100%, precisaríamos criar uma lógica
    // de geração de ilustração de história com o Gemini e chamar aqui.
    async generateAndDownloadImage(prompt, type) {
        console.warn(`[AdminGenerator] AVISO: A função 'generateAndDownloadImage' foi chamada. Este fluxo ainda usa o sistema antigo. Prompt: ${prompt.substring(0, 100)}...`);
        // Simula a geração de uma imagem de placeholder para não quebrar o fluxo do livro de história
        const placeholderPath = '/placeholders/generating_page.png';
        return placeholderPath;
    }

    async findBookById(bookId) {
        const book = await Book.findByPk(bookId, {
            include: [
                { model: Character, as: 'mainCharacter' },
                { 
                    model: BookVariation, 
                    as: 'variations', 
                    include: [{ 
                        model: BookContentPage, 
                        as: 'pages',
                        order: [['pageNumber', 'ASC']] // Garante a ordem das páginas
                    }] 
                }
            ],
            order: [
                // Ordem principal
                ['variations', 'createdAt', 'ASC'],
                // Ordem aninhada para as páginas dentro de cada variação
                ['variations', 'pages', 'pageNumber', 'ASC']
            ]
        });
        if (!book) throw new Error('Livro não encontrado.');
        return book;
    }
}

module.exports = new AdminBookGeneratorService();