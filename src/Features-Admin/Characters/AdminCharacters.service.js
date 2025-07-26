// src/Features-Admin/Characters/AdminCharacter.service.js
const { Character } = require('../../models');

const ADMIN_USER_ID = 1; // ID do usuário administrador padrão

class AdminCharacterService {


 // ✅ NOVA FUNÇÃO ADICIONADA: Lógica de geração de IA específica para o Admin
    async createCharacterWithIA(file) {
        if (!file) throw new Error('A imagem do desenho é obrigatória.');
    
        // ✅ CORREÇÃO: Usa o caminho correto para os assets do admin.
        const originalDrawingUrl = `/uploads/admin-assets/${file.filename}`;
        const publicImageUrl = `${process.env.APP_URL}${originalDrawingUrl}`;
        const DEFAULT_DESCRIPTION_PROMPT = "Descreva esta imagem de um desenho de forma objetiva e detalhada, focando em formas, linhas e características principais. A descrição deve ser curta, direta e sem mencionar cores. Comece a descrição com 'um personagem de desenho animado'.";

        const character = await Character.create({ userId: ADMIN_USER_ID, name: "Analisando desenho (Admin)...", originalDrawingUrl });

        try {
            const generationSetting = await promptService.getPrompt('USER_CHARACTER_DRAWING');
            const defaultElementId = generationSetting.defaultElementId;
            if (!defaultElementId) {
                throw new Error('Administrador: Nenhum Element padrão foi definido para "Geração de Personagem (Usuário)".');
            }

            const defaultElement = await LeonardoElement.findByPk(defaultElementId);
            if (!defaultElement || !defaultElement.basePromptText) {
                throw new Error(`O Element padrão (ID: ${defaultElementId}) não foi encontrado ou não tem um prompt base definido.`);
            }

            const detailedDescription = await visionService.describeImage(publicImageUrl, DEFAULT_DESCRIPTION_PROMPT);
            await character.update({ description: detailedDescription });

            const finalPrompt = defaultElement.basePromptText.replace('{{DESCRIPTION}}', detailedDescription);
            const leonardoElementId = defaultElement.leonardoElementId;

            const leonardoInitImageId = await leonardoService.uploadImageToLeonardo(file.path, file.mimetype);
            const generationId = await leonardoService.startImageGeneration(finalPrompt, leonardoInitImageId, leonardoElementId);
            await character.update({ generationJobId: generationId, name: "Gerando arte (Admin)..." });

            // A geração continua em segundo plano, não precisamos esperar aqui.
            // O frontend pode fazer polling ou o admin pode verificar a lista mais tarde.
            
            return character;

        } catch (error) {
            console.error(`[AdminCharacterService] Erro fatal na criação do personagem ID ${character.id}:`, error.message);
            await character.destroy();
            throw error; 
        }
    }

    async deleteCharacter(characterId) {
        const character = await Character.findOne({
            where: { id: characterId, userId: ADMIN_USER_ID }
        });

        if (!character) {
            throw new Error("Personagem oficial não encontrado.");
        }
        await character.destroy();
        return { message: "Personagem deletado com sucesso." };
    }


    /**
     * Lista todos os personagens que pertencem ao administrador.
     */
    async listOfficialCharacters() {
        const characters = await Character.findAll({
            where: {
                userId: ADMIN_USER_ID
            },
            order: [['createdAt', 'DESC']]
        });
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
            originalDrawingUrl: imageUrl,
            generatedCharacterUrl: imageUrl, // A imagem final é a mesma que a original
        });

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