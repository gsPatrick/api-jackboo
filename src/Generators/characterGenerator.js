
const fs = require('fs/promises');
const path = require('path');
const { Character } = require('../models');
const imageGenerationService = require('../OpenAI/services/imageGeneration.service');
const { downloadAndSaveImage } = require('../OpenAI/utils/imageDownloader');

/**
 * Converte um arquivo de imagem em uma string base64 para a API da OpenAI.
 * @param {string} filePath - O caminho completo para o arquivo de imagem.
 * @returns {Promise<string>} A string base64 da imagem.
 */
async function imageToBase64(filePath) {
  try {
    const data = await fs.readFile(filePath);
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

    try {
        // 1. Definir os caminhos para as imagens de referência de estilo
        const styleImagePaths = {
            // A imagem do urso (Jack) é o nosso "padrão ouro" do estilo final.
            style_gold_standard: path.join(__dirname, '..', '..', 'public', 'images', 'jack.png'),
            // A imagem do rabisco é o exemplo do que o usuário vai enviar.
            input_example_sketch: path.join(__dirname, '..', '..', 'public', 'images', 'rabisco.png'),
            // A imagem do morcego final é a prova da transformação bem-sucedida.
            output_example_final: path.join(__dirname, '..', '..', 'public', 'images', 'final.png'),
        };

        // 2. Converter todas as imagens para base64
        const base64Images = {
            style_gold_standard: await imageToBase64(styleImagePaths.style_gold_standard),
            input_example_sketch: await imageToBase64(styleImagePaths.input_example_sketch),
            output_example_final: await imageToBase64(styleImagePaths.output_example_final),
            userDrawing: await imageToBase64(userFile.path),
        };

        // 3. Construir a estrutura de mensagens para o GPT-4o com o prompt definitivo
        const messages = [
            {
                role: "system",
                content: `
You are a high-precision brand illustrator for the 'JackBoo' children's brand. Your critical task is to convert user-submitted images (like children's doodles or photos of animals) into a finished, on-brand character. You must strictly follow the visual laws defined in the JackBoo Brand Constitution. There is no room for creative deviation from this style.
`
            },
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: `
**THE JACKBOO BRAND CONSTITUTION - VISUAL LAW**

You are legally bound to adhere to these articles.

**Article 1: The Core Mission.**
Your primary function is to transform the user's input image into a polished character that belongs in the JackBoo universe. Analyze the input's core concept (e.g., a cat, a blue monster, a dog with a hat) and elevate it to our brand's professional standard.

**Article 2: Line Art.**
- **Rule 2.1:** All outlines are **thick, clean, black, and continuous**.
- **Rule 2.2:** The line weight must be **consistent** and **uniform** across the entire character.
- **Rule 2.3:** All shapes must be **fully closed vector-style paths**.

**Article 3: Color & Shading.**
- **Rule 3.1:** Base colors must be **flat, solid, vibrant, and cheerful**.
- **Rule 3.2 (Crucial):** Shading is permitted, but it MUST be **hard-edged cel-shading**. This means using a solid shape of a slightly darker tone of the base color to create a shadow.
- **Rule 3.3 (Forbidden):** **ABSOLUTELY NO SOFT GRADIENTS, AIRBRUSHING, BLURRING, OR COMPLEX TEXTURES.** This is a non-negotiable rule.

**Article 4: Anatomy & Expression.**
- **Rule 4.1:** Eyes must be **large, round, and expressive**, containing a single, clean white dot for a highlight.
- **Rule 4.2:** Proportions are **childlike and cute** (e.g., larger head, compact body).
- **Rule 4.3:** The final expression must be **friendly and welcoming**.

**VISUAL TRAINING - Study these examples to understand your task:**

1.  **GOLD STANDARD (\`style_gold_standard.png\`):** This is the perfect final style. Memorize its lines, colors, and hard-edged shading.
2.  **INPUT EXAMPLE (\`input_example_sketch.png\`):** This is an example of a low-fidelity user input.
3.  **OUTPUT EXAMPLE (\`output_example_final.png\`):** This shows a successful transformation from a concept to the final, on-brand style. Your goal is to replicate this level of quality and stylistic adherence.

Now, observe the provided images.
`
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
                        text: `
**FINAL TASK: EXECUTE TRANSFORMATION**

Your instructions are clear. Now, take the following new user-submitted image.
1.  Identify its core subject and characteristics.
2.  Redraw it precisely according to all articles of the JackBoo Brand Constitution.
3.  The final output must be a single character on a transparent background. Do not add any other elements.

Proceed.
`
                    },
                    // Imagem do usuário para a tarefa final
                    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Images.userDrawing}` } },
                ]
            }
        ];

        // 4. Chamar o serviço da OpenAI com o prompt multimodal
        const openAiUrl = await imageGenerationService.generateImageWithVision(messages);

        // 5. Baixar a imagem gerada e salvar
        const generatedCharacterUrl = await downloadAndSaveImage(openAiUrl);

        await character.update({
            generatedCharacterUrl,
            name: `Personagem #${character.id}`
        });

    } catch (error) {
        console.error(`Falha ao gerar a imagem de IA para o personagem ${character.id}. O desenho original será usado como fallback.`, error);
        await character.update({ generatedCharacterUrl: originalDrawingUrl });
    }

    return character;
}

module.exports = { generateCharacter };