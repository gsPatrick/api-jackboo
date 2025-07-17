const fs = require('fs/promises');
const path = require('path');
const { Character } = require('../models');
const imageGenerationService = require('../OpenAI/services/imageGeneration.service');

/**
 * Converte um arquivo de imagem em uma string base64 para a API da OpenAI.
 * @param {string} filePath - O caminho completo para o arquivo de imagem.
 * @returns {Promise<string>} A string base64 da imagem.
 */
async function imageToBase64(filePath) {
  try {
    const data = await fs.readFile(filePath);
    console.log(`[Generator] Sucesso ao ler e converter para base64: ${path.basename(filePath)}`);
    return Buffer.from(data).toString('base64');
  } catch (error) {
    console.error(`Erro ao ler o arquivo para base64: ${filePath}`, error);
    throw new Error(`Não foi possível carregar a imagem de referência: ${path.basename(filePath)}`);
  }
}

/**
 * Gera um personagem usando GPT-4o com referências visuais e um prompt de alta precisão.
 * @param {number} userId - ID do usuário.
 * @param {object} userFile - O objeto do arquivo enviado pelo usuário (de Multer).
 * @returns {Promise<Character>} A instância do personagem.
 */
async function generateCharacter(userId, userFile) {
    if (!userFile || !userFile.path) {
        throw new Error('A imagem do desenho do usuário é obrigatória e deve ter um caminho válido.');
    }
    const originalDrawingUrl = `/uploads/user-drawings/${userFile.filename}`;

    const character = await Character.create({
        userId,
        name: "Meu Novo Amigo",
        originalDrawingUrl,
        generatedCharacterUrl: null,
    });
    console.log("[Generator] URL do desenho original salva:", originalDrawingUrl);

    try {
        console.log("[Generator] Iniciando processo de geração de imagem com GPT-4o.");
        const styleImagePaths = {
            style_gold_standard: path.join(__dirname, '..', '..', 'public', 'images', 'jack.png'),
            input_example_sketch: path.join(__dirname, '..', '..', 'public', 'images', 'rabisco.png'),
            output_example_final: path.join(__dirname, '..', '..', 'public', 'images', 'final.png'),
        };
        console.log("[Generator] Caminhos das imagens de estilo definidos.");

        const base64Images = {
            style_gold_standard: await imageToBase64(styleImagePaths.style_gold_standard),
            input_example_sketch: await imageToBase64(styleImagePaths.input_example_sketch),
            output_example_final: await imageToBase64(styleImagePaths.output_example_final),
            userDrawing: await imageToBase64(userFile.path),
        };
        console.log("[Generator] Todas as imagens (estilo + usuário) foram convertidas para base64 com sucesso.");

        const messages = [
            {
                role: "system",
                content: `You are a high-precision brand illustrator for the 'JackBoo' children's brand. Your critical task is to convert user-submitted images (like children's doodles or photos of animals) into a finished, on-brand character. You must strictly follow the visual laws defined in the JackBoo Brand Constitution. There is no room for creative deviation from this style.`
            },
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: `**THE JACKBOO BRAND CONSTITUTION - VISUAL LAW**\n\nYou are legally bound to adhere to these articles.\n\n**Article 1: The Core Mission.**\nYour primary function is to transform the user's input image into a polished character that belongs in the JackBoo universe. Analyze the input's core concept (e.g., a cat, a blue monster, a dog with a hat) and elevate it to our brand's professional standard.\n\n**Article 2: Line Art.**\n- **Rule 2.1:** All outlines are **thick, clean, black, and continuous**.\n- **Rule 2.2:** The line weight must be **consistent** and **uniform** across the entire character.\n- **Rule 2.3:** All shapes must be **fully closed vector-style paths**.\n\n**Article 3: Color & Shading.**\n- **Rule 3.1:** Base colors must be **flat, solid, vibrant, and cheerful**.\n- **Rule 3.2 (Crucial):** Shading is permitted, but it MUST be **hard-edged cel-shading**. This means using a solid shape of a slightly darker tone of the base color to create a shadow.\n- **Rule 3.3 (Forbidden):** **ABSOLUTELY NO SOFT GRADIENTS, AIRBRUSHING, BLURRING, OR COMPLEX TEXTURES.** This is a non-negotiable rule.\n\n**Article 4: Anatomy & Expression.**\n- **Rule 4.1:** Eyes must be **large, round, and expressive**, containing a single, clean white dot for a highlight.\n- **Rule 4.2:** Proportions are **childlike and cute** (e.g., larger head, compact body).\n- **Rule 4.3:** The final expression must be **friendly and welcoming**.\n\n**VISUAL TRAINING - Study these examples to understand your task:**\n\n1.  **GOLD STANDARD (\`style_gold_standard.png\`):** This is the perfect final style. Memorize its lines, colors, and hard-edged shading.\n2.  **INPUT EXAMPLE (\`input_example_sketch.png\`):** This is an example of a low-fidelity user input.\n3.  **OUTPUT EXAMPLE (\`output_example_final.png\`):** This shows a successful transformation from a concept to the final, on-brand style. Your goal is to replicate this level of quality and stylistic adherence.\n\nNow, observe the provided images.`
                    },
                    { type: "image_url", image_url: { url: `data:image/png;base64,${base64Images.style_gold_standard}` } },
                    { type: "image_url", image_url: { url: `data:image/png;base64,${base64Images.input_example_sketch}` } },
                    { type: "image_url", image_url: { url: `data:image/png;base64,${base64Images.output_example_final}` } },
                ]
            },
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: `**FINAL TASK: EXECUTE TRANSFORMATION**\n\nYour instructions are clear. Now, take the following new user-submitted image.\n1.  Identify its core subject and characteristics.\n2.  Redraw it precisely according to all articles of the JackBoo Brand Constitution.\n3.  The final output must be a single character on a transparent background. Do not add any other elements.\n\nProceed.`
                    },
                    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Images.userDrawing}` } },
                ]
            }
        ];
        console.log("[Generator] Estrutura de mensagens para a API da OpenAI foi montada.");
        
        console.log("[Generator] Chamando imageGenerationService.generateImageWithVision...");
        const generatedCharacterUrl = await imageGenerationService.generateImageWithVision(
            messages,
            { userId: userId, entity: character }
        );
        
        await character.update({
            generatedCharacterUrl,
            name: `Personagem #${character.id}`
        });

    } catch (error) {
        console.error("===============================================================");
        console.error("[Generator] ERRO CAPTURADO! A geração de imagem falhou. Acionando fallback.");
        console.error("Mensagem do Erro:", error.message);
        console.error("Stack do Erro:", error.stack);
        console.error("===============================================================");
        await character.update({ generatedCharacterUrl: originalDrawingUrl });
    }

    return character;
}

module.exports = { generateCharacter };