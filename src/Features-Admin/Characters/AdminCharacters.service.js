// src/Features-Admin/Characters/AdminCharacter.service.js
const { Character } = require('../../models');
const contentService = require('../../Features/Content/Content.service');

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
        
        const imageUrl = `/uploads/admin-assets/${file.filename}`;

        return Character.create({
            userId: ADMIN_USER_ID,
            name: data.name,
            description: data.description,
            originalDrawingUrl: imageUrl,
            generatedCharacterUrl: imageUrl, // Para upload direto, a original e a gerada são a mesma.
        });
    }

    /**
     * ✅ CORREÇÃO: A função agora aceita o nome e o passa para o serviço de conteúdo.
     */
    async createCharacterWithIA(file, name) {
        if (!file) throw new Error('A imagem do desenho é obrigatória.');
        if (!name) throw new Error('O nome do personagem é obrigatório.');
        
        // Reutiliza o fluxo de criação, passando o ID do admin e o nome fornecido.
        return contentService.createCharacter(ADMIN_USER_ID, file, name);
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