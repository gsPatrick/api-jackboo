// src/Features-Admin/Characters/AdminCharacter.service.js
const { Character } = require('../../models');
const promptService = require('../../OpenAI/services/prompt.service');
const visionService = require('../../OpenAI/services/openai.service');
const leonardoService = require('../../OpenAI/services/leonardo.service');
const { downloadAndSaveImage } = require('../../OpenAI/utils/imageDownloader');

const ADMIN_USER_ID = 1; // ID do usuário administrador padrão
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class AdminCharacterService {

    /**
     * Lista todos os personagens que não pertencem a usuários comuns (personagens oficiais).
     */
    async listCharacters() {
        const characters = await Character.findAll({
            where: {
                userId: ADMIN_USER_ID
            },
            order: [['createdAt', 'DESC']]
        });
        // Retornando em um objeto para consistência com outras listagens
        return { characters };
    }

    /**
     * Cria um personagem diretamente a partir de uma imagem final fornecida.
     * Não usa IA para geração.
     */
    async createCharacterByUpload(file, data) {
        if (!file || !data.name || !data.description) {
            throw new Error("Imagem, nome e descrição são obrigatórios para o upload direto.");
        }
        
        const imageUrl = `/uploads/admin-assets/${file.filename}`;

        const character = await Character.create({
            userId: ADMIN_USER_ID,
            name: data.name,
            description: data.description,
            originalDrawingUrl: imageUrl, // Armazenamos a imagem final aqui
            generatedCharacterUrl: imageUrl, // E aqui também, pois já é a versão final
        });

        return character;
    }

    /**
     * Inicia a criação de um personagem usando IA a partir de um desenho/rascunho.
     */
    async createCharacterWithIA(file, elementId) {
        if (!file || !elementId) {
            throw new Error("O desenho base e um Modelo de IA (Element) são obrigatórios.");
        }

        const initialImageUrl = `/uploads/admin-assets/${file.filename}`;

        const character = await Character.create({
            userId: ADMIN_USER_ID,
            name: 'Gerando personagem via IA...',
            originalDrawingUrl: initialImageUrl,
        });

        // Inicia o processo assíncrono sem bloquear a resposta
        (async () => {
            try {
                const publicImageUrl = `${process.env.APP_URL}${character.originalDrawingUrl}`;

                // 1. Descrever a imagem usando o template do admin
                const descriptionPromptConfig = await promptService.getPrompt('INTERNAL_character_description');
                const detailedDescription = await visionService.describeImage(publicImageUrl, descriptionPromptConfig.basePromptText);
                await character.update({ description: detailedDescription });
                
                // 2. Preparar e enviar para o Leonardo.AI
                const finalPrompt = `conceito de personagem, ${detailedDescription}, fundo simples, arte digital`;
                const leonardoInitImageId = await leonardoService.uploadImageToLeonardo(file.path, file.mimetype);
                const generationId = await leonardoService.startImageGeneration(finalPrompt, leonardoInitImageId, elementId);
                await character.update({ generationJobId: generationId });
                
                // 3. Aguardar o resultado da geração (Polling)
                let finalImageUrl = null;
                const MAX_POLLS = 30; // ~2.5 minutos
                for (let i = 0; i < MAX_POLLS; i++) {
                    await sleep(5000);
                    const result = await leonardoService.checkGenerationStatus(generationId);
                    if (result.isComplete) {
                        finalImageUrl = result.imageUrl;
                        break;
                    }
                }

                if (!finalImageUrl) {
                    throw new Error("A geração da imagem no Leonardo.AI demorou muito para responder.");
                }

                // 4. Baixar a imagem final e concluir
                const localGeneratedUrl = await downloadAndSaveImage(finalImageUrl, 'characters');
                await character.update({
                    generatedCharacterUrl: localGeneratedUrl,
                    name: `Novo Personagem (Estilo ${elementId})`, // Um nome padrão melhor
                });

                console.log(`[AdminCharService] Personagem oficial ${character.id} gerado com sucesso!`);

            } catch (error) {
                console.error(`[AdminCharService] Erro na geração do personagem oficial ${character.id}: ${error.message}`);
                await character.update({ name: 'Falha na Geração', description: error.message });
            }
        })();

        // Retorna o registro inicial imediatamente
        return character;
    }

    /**
     * Deleta um personagem oficial.
     */
    async deleteCharacter(characterId) {
        const character = await Character.findOne({
            where: { id: characterId, userId: ADMIN_USER_ID }
        });

        if (!character) {
            throw new Error("Personagem oficial não encontrado.");
        }

        // O hook no modelo Character cuidará de deletar os arquivos físicos
        await character.destroy();
        return { message: "Personagem deletado com sucesso." };
    }
}

module.exports = new AdminCharacterService();