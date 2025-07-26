// src/Features-Admin/Characters/AdminCharacter.service.js
const { Character } = require('../../models');
// ✅ CORREÇÃO: Importa o ContentService para reutilizar a lógica de criação de personagem.
const contentService = require('../../Features/Content/Content.service');

if (!process.env.APP_URL) {
  throw new Error("ERRO CRÍTICO: A variável de ambiente APP_URL não está definida.");
}

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
            generatedCharacterUrl: imageUrl,
        });
    }

    /**
     * ✅ CORREÇÃO: A lógica de geração foi removida e substituída por uma chamada
     * ao serviço de conteúdo do usuário, passando o ID do admin.
     * Isso garante que o fluxo seja sempre idêntico.
     */
    async createCharacterWithIA(file) {
        if (!file) throw new Error('A imagem do desenho é obrigatória.');
        // Reutiliza o mesmo fluxo de criação de personagem do usuário,
        // apenas garantindo que o personagem seja atribuído ao admin.
        return contentService.createCharacter(ADMIN_USER_ID, file);
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