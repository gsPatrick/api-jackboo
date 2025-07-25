// src/Features-Admin/Characters/AdminCharacter.service.js
const { Character } = require('../../models');
const visionService = require('../../OpenAI/services/openai.service');
const leonardoService = require('../../OpenAI/services/leonardo.service');
const promptService = require('../../OpenAI/services/prompt.service');
const { downloadAndSaveImage } = require('../../OpenAI/utils/imageDownloader');

const APP_URL = process.env.APP_URL;
const ADMIN_USER_ID = 1; // ID do usuário admin/sistema
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class AdminCharacterService {
    async listOfficialCharacters() {
        const characters = await Character.findAll({
            order: [['createdAt', 'DESC']],
        });
        return { characters };
    }
    
    /**
     * GERAÇÃO COMPLETA: Cria um personagem oficial a partir de um desenho, usando o fluxo de IA.
     * Semelhante ao fluxo do usuário, mas usa templates de IA de 'ADMIN'.
     */
    async createOfficialCharacter(file) {
        if (!file) throw new Error('O arquivo do desenho é obrigatório.');
        
        const originalDrawingUrl = `/uploads/admin-assets/${file.filename}`;
        const publicImageUrl = `${APP_URL}${originalDrawingUrl}`;

        const character = await Character.create({
            userId: ADMIN_USER_ID,
            name: "Gerando personagem via IA...",
            originalDrawingUrl,
        });

        (async () => {
            try {
                // Busca os templates de IA específicos para o fluxo de ADMIN
                const descriptionPromptConfig = await promptService.getPrompt('ADMIN_character_description');
                const generationPromptConfig = await promptService.getPrompt('ADMIN_character_drawing');

                const detailedDescription = await visionService.describeImage(publicImageUrl, descriptionPromptConfig.basePromptText);
                await character.update({ description: `IA descreveu o desenho como: "${detailedDescription}"` });

                const cleanedDescription = detailedDescription.replace(/\n/g, ' ').trim();
                const finalPrompt = generationPromptConfig.basePromptText.replace('{{DESCRIPTION}}', cleanedDescription);
                
                const leonardoInitImageId = await leonardoService.uploadImageToLeonardo(file.path, file.mimetype);
                const generationId = await leonardoService.startImageGeneration(finalPrompt, leonardoInitImageId);
                
                await character.update({ generationJobId: generationId });

                let finalImageUrl = null;
                const MAX_POLLS = 20; // ~1.5 minutos de polling
                for (let i = 0; i < MAX_POLLS; i++) {
                    await sleep(5000); 
                    const result = await leonardoService.checkGenerationStatus(generationId);
                    if (result.isComplete) {
                        finalImageUrl = result.imageUrl;
                        break;
                    }
                }
                if (!finalImageUrl) throw new Error("A geração da imagem demorou muito para responder.");
                
                const localGeneratedUrl = await downloadAndSaveImage(finalImageUrl, 'admin-assets');

                await character.update({
                    generatedCharacterUrl: localGeneratedUrl,
                    name: 'Novo Personagem Oficial'
                });
                console.log(`[AdminCharService] Personagem oficial ${character.id} gerado com sucesso.`);

            } catch (error) {
                console.error(`[AdminCharService] Erro na geração do personagem oficial ${character.id}:`, error.message);
                await character.update({
                    name: 'Falha na Geração via IA',
                    description: `Erro: ${error.message}`
                });
            }
        })();
        
        return character; // Retorna imediatamente
    }

    /**
     * UPLOAD DIRETO: Cria um personagem oficial a partir de uma imagem final.
     */
    async createOfficialCharacterByUpload(name, file) {
        if (!name || !file) {
            throw new Error('Nome e arquivo de imagem são obrigatórios.');
        }

        const imageUrl = `/uploads/admin-assets/${file.filename}`;

        const character = await Character.create({
            name,
            originalDrawingUrl: imageUrl,
            generatedCharacterUrl: imageUrl,
            description: 'Descrição sendo gerada pela IA...',
            userId: ADMIN_USER_ID
        });

        (async () => {
            try {
                const publicImageUrl = `${APP_URL}${imageUrl}`;
                const descriptionPromptConfig = await promptService.getPrompt('ADMIN_character_description');
                const detailedDescription = await visionService.describeImage(publicImageUrl, descriptionPromptConfig.basePromptText);
                
                await character.update({ description: detailedDescription });
                console.log(`[AdminCharService] Descrição para o personagem ${character.id} (upload) gerada com sucesso.`);

            } catch (error) {
                console.error(`[AdminCharService] Erro ao gerar descrição (upload) para o personagem ${character.id}:`, error.message);
                await character.update({ description: 'Falha ao gerar descrição automática.' });
            }
        })();

        return character;
    }

    async deleteOfficialCharacter(id) {
        const character = await Character.findByPk(id);
        if (!character) {
            throw new Error('Personagem não encontrado.');
        }
        await character.destroy();
        return { message: 'Personagem deletado com sucesso.' };
    }
}

module.exports = new AdminCharacterService();