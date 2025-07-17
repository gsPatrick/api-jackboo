
// src/Generators/characterGenerator.js

const { Character } = require('../models');
// Corrigindo a importação - o serviço de geração de imagem já faz o download.
const imageGenerationService = require('../OpenAI/services/imageGeneration.service');

const STYLE_REFERENCE_PROMPT = `Using the user-uploaded drawing as the primary subject, generate a clean, vector-style cartoon illustration. The goal is to transform the drawing to perfectly match the friendly and simple visual style of Jack and his friends. Key style points:
... (o resto do prompt continua o mesmo) ...
`;

async function generateCharacter(userId, file) {
    if (!file) {
        throw new Error('A imagem do desenho é obrigatória.');
    }
    // AQUI ESTÁ A CORREÇÃO PARA O NOME DO ARQUIVO UNDEFINED
    const originalDrawingUrl = `/uploads/user-drawings/${file.filename}`;

    const character = await Character.create({
        userId,
        name: "Meu Novo Amigo",
        originalDrawingUrl, // Agora terá o nome correto do arquivo
        generatedCharacterUrl: null,
    });

    try {
        // AQUI ESTÁ A MUDANÇA PRINCIPAL
        // Chamamos o método genérico `generateImage` do nosso serviço.
        // O próprio serviço agora cuida do download e retorna a URL local.
        const generatedCharacterUrl = await imageGenerationService.generateImage(
            STYLE_REFERENCE_PROMPT,
            { userId: userId, entity: character } // Passamos o contexto para o log
        );

        await character.update({
            generatedCharacterUrl, // URL local, ex: /uploads/ai-generated/uuid.png
            name: `Personagem #${character.id}`
        });

    } catch (error) {
        console.error(`Falha ao gerar a imagem de IA para o personagem ${character.id}. O desenho original será usado como fallback.`, error);
        await character.update({ generatedCharacterUrl: originalDrawingUrl });
    }

    return character;
}

module.exports = { generateCharacter };