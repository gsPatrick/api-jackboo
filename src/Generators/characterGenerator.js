// src/Generators/characterGenerator.js

const { Character } = require('../models');
const imageGenerationService = require('../OpenAI/services/imageGeneration.service');

// --- CONSTANTES DE CONFIGURAÇÃO PARA O REPLICATE ---
const REPLICATE_MODEL_VERSION = '31cbf82d3e6f368be33c12010c260de298982916a55a3c69c175475a022fbf79';
const PROMPT = "Generate a cute cartoon character in the same friendly and child-like style as the reference image, preserving the shape and structure of the input image.";

// --- MUDANÇA AQUI: URLs DO IMGUR ---
const JACK_STYLE_IMAGE_URL = 'https://i.imgur.com/PyCzkfO.png'; 
const USER_DRAWING_URL_TEST = 'https://i.imgur.com/uSoEFlL.jpeg';
// ------------------------------------

async function generateCharacter(userId, userFile) {
    if (!userFile) {
        throw new Error('O objeto de arquivo do usuário é obrigatório.');
    }
    
    // O originalDrawingUrl continua sendo um placeholder para o banco de dados.
    const originalDrawingUrl = `/uploads/user-drawings/${userFile.filename}`;

    const character = await Character.create({
        userId,
        name: "Meu Novo Amigo (Teste Imgur)",
        originalDrawingUrl,
        generatedCharacterUrl: null,
    });

    try {
        const userDrawingPublicUrl = USER_DRAWING_URL_TEST;
            
        console.log(`[generateCharacter] URL de estilo enviada ao Replicate: ${JACK_STYLE_IMAGE_URL}`);
        console.log(`[generateCharacter] URL do desenho enviada ao Replicate: ${userDrawingPublicUrl}`);
        
        const input = {
            prompt: PROMPT,
            ip_adapter_image: JACK_STYLE_IMAGE_URL,
            lineart_image: userDrawingPublicUrl, 
            ip_adapter_weight: 0.9,
            lineart_conditioning_scale: 0.9,
            guidance_scale: 5,
            num_inference_steps: 30,
            max_width: 768,
            max_height: 768,
            disable_safety_check: true,
        };
        
        const generatedCharacterUrl = await imageGenerationService.generateCharacterWithReplicate(
            REPLICATE_MODEL_VERSION,
            input,
            { userId: userId, entity: character }
        );
        
        await character.update({
            generatedCharacterUrl,
            name: `Personagem #${character.id}`
        });

    } catch (error) {
        console.error(`Falha ao gerar a imagem de IA para o personagem ${character.id}.`, error);
    }

    return character;
}

module.exports = { generateCharacter };