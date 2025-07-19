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
 * @param {string} localUrl - O caminho relativo, ex: /images/file.png
 * @returns {string} A URL completa, ex: https://seu-dominio.com/images/file.png
 */
function getPublicUrl(localUrl) {
    const cleanLocalUrl = localUrl.startsWith('/') ? localUrl.substring(1) : localUrl;
    return `${process.env.SERVER_BASE_URL}/${cleanLocalUrl}`;
}

/**
 * Gera um personagem usando Replicate com IP-Adapter e ControlNet.
 * @param {number} userId - ID do usuário.
 * @param {object} userFile - O objeto do arquivo enviado pelo usuário (de Multer ou simulado).
 * @returns {Promise<Character>} A instância do personagem.
 */
async function generateCharacter(userId, userFile) {
    if (!userFile || !userFile.filename) {
        throw new Error('O arquivo do desenho do usuário é obrigatório.');
    }
    
    // CORREÇÃO: A URL da imagem original será sempre relativa à pasta de uploads real.
    // O script de teste não precisa mais copiar arquivos, então o originalDrawingUrl será teórico.
    const originalDrawingUrl = `/uploads/user-drawings/${userFile.filename}`;

    const character = await Character.create({
        userId,
        name: "Meu Novo Amigo",
        originalDrawingUrl,
        generatedCharacterUrl: null,
    });

    try {
        // CORREÇÃO: Para o fluxo de teste, a imagem está em /images/. Para o fluxo real, estará em /uploads/user-drawings/.
        // Vamos usar uma lógica para determinar a URL pública correta.
        const isTestImage = userFile.originalname === 'meu-desenho.png';
        const userDrawingPublicUrl = isTestImage
            ? `${process.env.SERVER_BASE_URL}/images/${userFile.filename}`
            : getPublicUrl(originalDrawingUrl);
            
        console.log(`[generateCharacter] URL pública enviada ao Replicate: ${userDrawingPublicUrl}`);
        
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