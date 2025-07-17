// src/Generators/characterGenerator.js

const { Character } = require('../models');
const imageGenerationService = require('../OpenAI/services/imageGeneration.service');

// --- PROMPT FIXO E REFERÊNCIAS DE ESTILO ---
const STYLE_REFERENCE_PROMPT = `Using the uploaded reference image [[IMAGE]] as the subject, generate a cartoon-style illustration that transforms it to match the exact visual style of Jack and his friends. Key style points:

• **Style:** Clean, vectorized children's cartoon.
• **Outlines:** Consistent, clean, continuous black lines.
• **Colors:** Flat, vibrant colors. No gradients or complex textures.
• **Features:** Large, expressive eyes; small, rounded nose.
• **Proportions:** Childlike (larger head, compact body).
• **Expression:** Friendly and welcoming.
• **Background:** Simple and cheerful—solid color or minimalist scene.
• **Fidelity:** Preserve key features and posture of the original image.
• **Resolution:** High-resolution PNG, transparent background is a plus.

**Crucial:** Strictly follow the line weight, color palette, facial proportions, and overall simplicity found in the reference style of Jack and his friends.`;

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
    
    // A IA precisa da URL da imagem de referência. Vamos adicionar isso ao prompt.
    // Assumimos que o imageGenerationService pode lidar com um prompt e uma URL de imagem de referência.
    const finalPrompt = STYLE_REFERENCE_PROMPT.replace('[[IMAGE]]', `(the user-uploaded drawing)`);

    // 1. Cria o registro do personagem no banco para obter um ID.
    const character = await Character.create({
        userId,
        name: "Meu Novo Amigo", // Nome temporário
        originalDrawingUrl,
        generatedCharacterUrl: null, // Será preenchido em seguida
    });

    try {
        // 2. Chama o serviço de IA para gerar a imagem estilizada.
        // O `imageGenerationService` precisa ser adaptado para aceitar uma imagem de referência.
        // Vamos assumir que ele agora tem um método `generateFromImagePrompt`.
        const generatedCharacterUrl = await imageGenerationService.generateFromImagePrompt({
            prompt: finalPrompt,
            referenceImageUrl: originalDrawingUrl, // A imagem que o usuário enviou
            // Adicionalmente, poderíamos passar as imagens do Jack e amigos aqui se a API da IA suportar múltiplas referências.
        });
        
        // 3. Atualiza o personagem com a nova URL e um nome melhor.
        await character.update({
            generatedCharacterUrl,
            name: `Personagem #${character.id}`
        });

    } catch (error) {
        console.error(`Falha ao gerar a imagem de IA para o personagem ${character.id}. O desenho original será usado.`, error);
        // Se a geração falhar, usamos a imagem original como fallback.
        await character.update({ generatedCharacterUrl: originalDrawingUrl });
    }

    return character;
}

module.exports = { generateCharacter };