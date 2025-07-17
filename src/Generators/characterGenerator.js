
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
    return Buffer.from(data).toString('base64');
  } catch (error) {
    console.error(`Erro ao ler o arquivo para base64: ${filePath}`, error);
    throw new Error(`Não foi possível carregar a imagem de referência: ${path.basename(filePath)}`);
  }
}

/**
 * Gera um personagem usando GPT-4o com uma referência de estilo única e um prompt direto.
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
        // 1. Definir o caminho para a ÚNICA imagem de referência: o Jack.
        const jackStyleImagePath = path.join(__dirname, '..', '..', 'public', 'images', 'jack.png');

        // 2. Converter a imagem de estilo e a imagem do usuário para base64.
        const jackStyleBase64 = await imageToBase64(jackStyleImagePath);
        const userDrawingBase64 = await imageToBase64(userFile.path);

        // 3. Construir a estrutura de mensagens SIMPLIFICADA para o GPT-4o.
        const messages = [
            {
                role: "system",
                content: "You are a specialized illustrator who transforms children's drawings into professional characters in a specific, consistent art style."
            },
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: "This is the 'Jack' character. This is the gold standard art style you must replicate exactly. Study its clean lines, flat colors, and simple hard-edged shading."
                    },
                    {
                        type: "image_url",
                        image_url: { url: `data:image/png;base64,${jackStyleBase64}` }
                    },
                ]
            },
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        text: "Now, take this user's drawing and transform it into a new character that looks like it belongs in the exact same universe as 'Jack'. Match the style perfectly. The final output must be only the character on a transparent background."
                    },
                    {
                        type: "image_url",
                        image_url: { url: `data:image/jpeg;base64,${userDrawingBase64}` }
                    },
                ]
            }
        ];

        // 4. Chamar o serviço da OpenAI com o prompt multimodal.
        const generatedCharacterUrl = await imageGenerationService.generateImageWithVision(
            messages,
            { userId: userId, entity: character }
        );
        
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