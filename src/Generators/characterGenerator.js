const fs = require('fs/promises');
const path = require('path');
const { Character } = require('../models');
const imageGenerationService = require('../OpenAI/services/imageGeneration.service');
const { downloadAndSaveImage } = require('../OpenAI/utils/imageDownloader');

async function imageToBase64(filePath) {
  try {
    const data = await fs.readFile(filePath);
    console.log(`[Generator] Sucesso ao ler e converter para base64: ${path.basename(filePath)}`);
    return Buffer.from(data).toString('base64');
  } catch (error) {
    console.error(`[Generator] ERRO CRÍTICO ao ler o arquivo para base64: ${filePath}`, error);
    throw new Error(`Não foi possível carregar a imagem de referência interna: ${path.basename(filePath)}`);
  }
}

async function generateCharacter(userId, userFile) {
    if (!userFile || !userFile.path) {
        throw new Error('A imagem do desenho do usuário é obrigatória e deve ter um caminho válido.');
    }
    const originalDrawingUrl = `/uploads/user-drawings/${userFile.filename}`;
    console.log(`[Generator] URL do desenho original salva: ${originalDrawingUrl}`);

    const character = await Character.create({
        userId,
        name: "Meu Novo Amigo",
        originalDrawingUrl,
        generatedCharacterUrl: null,
    });

    try {
        console.log('[Generator] Iniciando processo de geração de imagem com GPT-4o.');

        const styleImagePaths = {
            style_gold_standard: path.join(__dirname, '..', '..', 'public', 'images', 'jack.png'),
            input_example_sketch: path.join(__dirname, '..', '..', 'public', 'images', 'rabisco.png'),
            output_example_final: path.join(__dirname, '..', '..', 'public', 'images', 'final.png'),
        };
        console.log('[Generator] Caminhos das imagens de estilo definidos.');

        const base64Images = {
            style_gold_standard: await imageToBase64(styleImagePaths.style_gold_standard),
            input_example_sketch: await imageToBase64(styleImagePaths.input_example_sketch),
            output_example_final: await imageToBase64(styleImagePaths.output_example_final),
            userDrawing: await imageToBase64(userFile.path),
        };
        console.log('[Generator] Todas as imagens (estilo + usuário) foram convertidas para base64 com sucesso.');

        const messages = [
            // ... (o prompt da constituição permanece o mesmo)
            {
                role: "system",
                content: `You are a high-precision brand illustrator for the 'JackBoo' children's brand...`
            },
            {
                role: "user",
                content: [
                    { type: "text", text: `**THE JACKBOO BRAND CONSTITUTION - VISUAL LAW** ...` },
                    { type: "image_url", image_url: { url: `data:image/png;base64,${base64Images.style_gold_standard}` } },
                    { type: "image_url", image_url: { url: `data:image/png;base64,${base64Images.input_example_sketch}` } },
                    { type: "image_url", image_url: { url: `data:image/png;base64,${base64Images.output_example_final}` } },
                ]
            },
            {
                role: "user",
                content: [
                    { type: "text", text: `**FINAL TASK: EXECUTE TRANSFORMATION** ...` },
                    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Images.userDrawing}` } },
                ]
            }
        ];
        console.log('[Generator] Estrutura de mensagens para a API da OpenAI foi montada.');

        console.log('[Generator] Chamando imageGenerationService.generateImageWithVision...');
        const openAiUrl = await imageGenerationService.generateImageWithVision(messages);
        console.log(`[Generator] OpenAI retornou a URL da imagem gerada: ${openAiUrl}`);

        console.log('[Generator] Baixando a imagem da URL da OpenAI...');
        const generatedCharacterUrl = await downloadAndSaveImage(openAiUrl);
        console.log(`[Generator] Imagem baixada e salva localmente em: ${generatedCharacterUrl}`);

        await character.update({
            generatedCharacterUrl,
            name: `Personagem #${character.id}`
        });
        console.log('[Generator] Personagem atualizado no banco de dados com a nova URL.');

    } catch (error) {
        // --- ESTE É O BLOCO QUE ESTÁ SENDO EXECUTADO ---
        console.error("===============================================================");
        console.error("[Generator] ERRO CAPTURADO! A geração de imagem falhou. Acionando fallback.");
        console.error("Mensagem do Erro:", error.message);
        console.error("Stack do Erro:", error.stack);
        console.error("===============================================================");
        
        await character.update({ generatedCharacterUrl: originalDrawingUrl });
    }

    // Recarrega o personagem do banco para garantir que estamos retornando os dados mais recentes.
    return character.reload();
}

module.exports = { generateCharacter };