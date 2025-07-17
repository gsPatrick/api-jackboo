
// src/Generators/characterGenerator.js

const { Character } = require('../models');
const imageGenerationService = require('../OpenAI/services/imageGeneration.service');
const { downloadAndSaveImage } = require('../OpenAI/utils/imageDownloader');

// --- PROMPT FIXO PARA GERAÇÃO DE PERSONAGEM ---
// Este prompt é o coração da geração. Ele guia a IA para transformar
// o desenho do usuário no estilo visual correto.
const STYLE_REFERENCE_PROMPT = `Using the user-uploaded drawing as the primary subject, generate a clean, vector-style cartoon illustration. The goal is to transform the drawing to perfectly match the friendly and simple visual style of Jack and his friends. Key style points:

• **Style:** Children's cartoon, vectorized look.
• **Outlines:** Consistent, clean, and continuous black lines.
• **Colors:** Flat, vibrant colors. Strictly no gradients or complex textures.
• **Features:** Large, expressive eyes; small, rounded nose.
• **Proportions:** Childlike (larger head, compact body).
• **Expression:** Friendly and welcoming.
• **Background:** Simple and cheerful—a solid color or a minimalist, playful scene.
• **Fidelity:** Preserve the main features and posture of the original drawing.

**Crucial:** The final image must strictly follow the line weight, color palette, facial proportions, and overall simplicity of the Jack and friends' art style.`;

/**
 * Gera um personagem a partir do desenho de um usuário.
 * @param {number} userId - ID do usuário que está criando.
 * @param {object} file - O arquivo de imagem enviado via Multer.
 * @returns {Promise<Character>} A instância do personagem criado e com a imagem gerada.
 */
async function generateCharacter(userId, file) {
    if (!file) {
        throw new Error('A imagem do desenho é obrigatória.');
    }
    const originalDrawingUrl = `/uploads/user-drawings/${file.filename}`;

    // 1. Cria o registro do personagem no banco para obter um ID.
    // Usamos um nome temporário que será atualizado depois.
    const character = await Character.create({
        userId,
        name: "Meu Novo Amigo",
        originalDrawingUrl,
        generatedCharacterUrl: null, // Será preenchido em seguida
    });

    try {
        // 2. Chama a API da OpenAI para gerar a imagem estilizada.
        const openAiUrl = await imageGenerationService.generateImage(STYLE_REFERENCE_PROMPT, {
            // Nota: Se a API da OpenAI suportar envio de imagem de referência diretamente,
            // poderíamos passar a `originalDrawingUrl` aqui. Por enquanto, o prompt textual é o guia.
        });

        // 3. Baixa a imagem gerada pela IA e a salva localmente no nosso servidor.
        const generatedCharacterUrl = await downloadAndSaveImage(openAiUrl);

        // 4. Atualiza o registro do personagem no banco com a URL da imagem gerada e um nome final.
        await character.update({
            generatedCharacterUrl,
            name: `Personagem #${character.id}`
        });

    } catch (error) {
        console.error(`Falha ao gerar a imagem de IA para o personagem ${character.id}. O desenho original será usado como fallback.`, error);
        // Se a geração falhar, garantimos que o usuário ainda tenha uma imagem (a original).
        await character.update({ generatedCharacterUrl: originalDrawingUrl });
    }

    // Retorna o objeto completo do personagem para o frontend.
    return character;
}

module.exports = { generateCharacter };