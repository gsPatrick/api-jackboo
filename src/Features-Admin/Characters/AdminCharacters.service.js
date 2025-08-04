// src/Features-Admin/Characters/AdminCharacter.service.js
const { Character, LeonardoElement } = require('../../models');
const contentService = require('../../Features/Content/Content.service');
const promptService = require('../../OpenAI/services/prompt.service');

const fs = require('fs/promises');
const path = require('path');


const ADMIN_USER_ID = 1;

class AdminCharacterService {

    async listOfficialCharacters() {
        const characters = await Character.findAll({
            where: { userId: ADMIN_USER_ID },
            order: [['createdAt', 'DESC']]
        });
        return { characters };
    }

    async createCharacterByUpload(file, data) {
        if (!file || !data.name || !data.description) {
            throw new Error("Imagem, nome e descrição são obrigatórios para o upload direto.");
        }
        
        const targetDir = path.join(process.cwd(), 'uploads', 'ai-generated');
        const newPath = path.join(targetDir, file.filename);
        const finalImageUrl = `/uploads/ai-generated/${file.filename}`;

        try {
            await fs.mkdir(targetDir, { recursive: true });
            await fs.rename(file.path, newPath);
        } catch (error) {
            console.error("Erro ao mover o arquivo de personagem de upload direto:", error);
            throw new Error("Falha ao processar o arquivo de imagem no servidor.");
        }
        
        return Character.create({
            userId: ADMIN_USER_ID,
            name: data.name,
            description: data.description,
            originalDrawingUrl: finalImageUrl, 
            generatedCharacterUrl: finalImageUrl,
        });
    }

    /**
     * ATUALIZADO: Corrige a busca do LeonardoElement para usar leonardoElementId.
     */
    async createCharacterWithIA(file, name) {
        if (!file) throw new Error('A imagem do desenho é obrigatória.');
        if (!name) throw new Error('O nome do personagem é obrigatório.');
        
        const characterDescriptionSetting = await promptService.getPrompt('USER_CHARACTER_DRAWING');
        const defaultElementId = characterDescriptionSetting.defaultElementId; // Este é o leonardoElementId (string)

        if (!defaultElementId) {
            throw new Error('Administrador: Nenhum Element padrão foi definido para "Geração de Personagem (Usuário)".');
        }

        // ✅ CORREÇÃO AQUI: Usar findOne com where para buscar pelo leonardoElementId
        const defaultElement = await LeonardoElement.findOne({ where: { leonardoElementId: defaultElementId } });
        
        if (!defaultElement || !defaultElement.basePromptText) {
            throw new Error(`O Element padrão (ID: ${defaultElementId}) não foi encontrado ou não tem um prompt base definido.`);
        }

        // Reutiliza o fluxo de criação do contentService, passando o ID do admin, o nome,
        // o prompt do sistema GPT e o prompt base do LeonardoElement.
        return contentService.createCharacter(
            ADMIN_USER_ID, 
            file, 
            name, 
            characterDescriptionSetting.basePromptText, // Prompt do sistema GPT para descrição
            defaultElement.leonardoElementId,           // ID do Element Leonardo (string)
            defaultElement.basePromptText               // Prompt base do Element Leonardo
        );
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
}

module.exports = new AdminCharacterService();