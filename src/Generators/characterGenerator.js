// src/Generators/characterGenerator.js

const { Character } = require('../models');
const imageGenerationService = require('../OpenAI/services/imageGeneration.service');
const path = require('path');

// --- CONSTANTES DE CONFIGURAÇÃO PARA O REPLICATE ---
const REPLICATE_MODEL_VERSION = '31cbf82d3e6f368be33c12010c260de298982916a55a3c69c175475a022fbf79';
const JACK_STYLE_IMAGE_URL = `${process.env.SERVER_BASE_URL}/images/jack.png`;
const PROMPT = "Generate a cute cartoon character in the same friendly and child-like style as the reference image, preserving the shape and structure of the input image.";

/**
 * Constrói a URL pública completa para um arquivo local.
 * @param {string} localUrl - O caminho relativo, ex: /uploads/user-drawings/file.png
 * @returns {string} A URL completa, ex: https://seu-dominio.com/uploads/user-drawings/file.png
 */
function getPublicUrl(localUrl) {
    const cleanLocalUrl = localUrl.startsWith('/') ? localUrl.substring(1) : localUrl;
    return `${process.env.SERVER_BASE_URL}/${cleanLocalUrl}`;
}

/**
 * Gera um personagem usando Replicate com IP-Adapter e ControlNet.
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
        // 1. Construir a URL pública da imagem que o usuário enviou.
        const userDrawingPublicUrl = getPublicUrl(originalDrawingUrl);
        console.log(`[generateCharacter] URL pública enviada ao Replicate: ${userDrawingPublicUrl}`);
        
        // 2. Montar o objeto de input para a API do Replicate.
        const input = {
            prompt: PROMPT,
            ip_adapter_image: JACK_STYLE_IMAGE_URL,
            // Assumimos que o input do usuário é mais parecido com um desenho/foto.
            // Se fosse um rabisco puro, usaríamos 'scribble_image'.
            lineart_image: userDrawingPublicUrl, 
            ip_adapter_weight: 0.9,
            lineart_conditioning_scale: 0.9,
            guidance_scale: 5,
            num_inference_steps: 30,
            max_width: 768,
            max_height: 768,
            disable_safety_check: true, // Para evitar falsos positivos com desenhos infantis
        };
        
        // 3. Chamar o serviço orquestrador para gerar a imagem.
        const generatedCharacterUrl = await imageGenerationService.generateCharacterWithReplicate(
            REPLICATE_MODEL_VERSION,
            input,
            { userId: userId, entity: character }
        );
        
        // 4. Atualizar o personagem com a URL da imagem gerada.
        await character.update({
            generatedCharacterUrl,
            name: `Personagem #${character.id}`
        });

    } catch (error) {
        console.error(`Falha ao gerar a imagem de IA para o personagem ${character.id}. O desenho original será mantido.`, error);
        // Fallback: Se a geração falhar, mantemos o registro do personagem, mas sem a imagem gerada.
        // O frontend pode mostrar o `originalDrawingUrl` no lugar.
        // Opcional: Adicionar um campo de status no modelo Character para registrar a falha.
    }

    return character;
}

module.exports = { generateCharacter };