// src/Features-Admin/Characters/AdminCharacter.service.js
const { Character } = require('../../models');

const ADMIN_USER_ID = 1; // ID do usuário administrador padrão

class AdminCharacterService {

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