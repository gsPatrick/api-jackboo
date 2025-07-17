
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
 * Gera um personagem usando GPT-4o com uma referência de estilo e seu prompt simplificado.
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
        // 1. Definir o caminho para a imagem de referência do Jack.
        const jackStyleImagePath = path.join(__dirname, '..', '..', 'public', 'images', 'jack.png');

        // 2. Converter a imagem de estilo e a imagem do usuário para base64.
        const jackStyleBase64 = await imageToBase64(jackStyleImagePath);
        const userDrawingBase64 = await imageToBase64(userFile.path);

        // 3. Construir a estrutura de mensagens com seu prompt e uma instrução final clara.
        const messages = [
            {
                role: "system",
                content: "You are a creative illustrator who transforms children's drawings into a specific cartoon style."
            },
            {
                role: "user",
                content: [
                    {
                        type: "text",
                        // SEU PROMPT SIMPLIFICADO AQUI
                        text: `
Crie um personagem infantil no estilo do JackBoo:
- arte vetorial 2D, traços suaves, contorno escuro.
- proporções infantis, olhos grandes e expressivos.
- cores vibrantes e sólidas.
- expressão alegre, postura divertida.

A imagem de referência do estilo JackBoo está anexada.
A imagem a ser transformada é o desenho do usuário.

**MANDATORY OUTPUT:**
- The output MUST be a single, centered character image.
- The background MUST be transparent.
- **DO NOT** create character sheets, turnarounds, multiple views, or any text annotations. Just the final character.
`
                    },
                    {
                        type: "image_url",
                        image_url: { 
                            url: `data:image/png;base64,${jackStyleBase64}`,
                            detail: "low" // Usamos 'low' para a imagem de estilo, economiza tokens.
                        }
                    },
                    {
                        type: "image_url",
                        image_url: { 
                            url: `data:image/jpeg;base64,${userDrawingBase64}`,
                            detail: "high" // Usamos 'high' para a imagem do usuário, para capturar detalhes.
                        }
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