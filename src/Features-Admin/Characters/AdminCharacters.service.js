// src/Features-Admin/Characters/AdminCharacter.service.js
const { Character, LeonardoElement } = require('../../models'); // ✅ Importar LeonardoElement
const contentService = require('../../Features/Content/Content.service');
const promptService = require('../../OpenAI/services/prompt.service'); // ✅ Importar promptService

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
        
        // 1. Define o diretório de destino final para as imagens geradas.
        const targetDir = path.join(process.cwd(), 'uploads', 'ai-generated');

        // 2. Define o caminho completo do novo local do arquivo.
        const newPath = path.join(targetDir, file.filename);

        // 3. Define a URL que será acessível pela web e salva no banco de dados.
        const finalImageUrl = `/uploads/ai-generated/${file.filename}`;

        try {
            // Garante que o diretório de destino exista, criando-o se necessário.
            await fs.mkdir(targetDir, { recursive: true });
            // Move o arquivo da sua localização original (em admin-assets) para o novo local.
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
     * ✅ ATUALIZADO: A função agora aceita o nome e passa o prompt do sistema do DB para o serviço de conteúdo.
     */
    async createCharacterWithIA(file, name) {
        if (!file) throw new Error('A imagem do desenho é obrigatória.');
        if (!name) throw new Error('O nome do personagem é obrigatório.');
        
        // ✅ ATUALIZADO: Busca a configuração de IA para a descrição do personagem
        const characterDescriptionSetting = await promptService.getPrompt('USER_CHARACTER_DRAWING');
        const defaultElementId = characterDescriptionSetting.defaultElementId;

        if (!defaultElementId) {
            throw new Error('Administrador: Nenhum Element padrão foi definido para "Geração de Personagem (Usuário)".');
        }

        // ✅ ATUALIZADO: Busca o LeonardoElement para obter seu prompt base
        const defaultElement = await LeonardoElement.findByPk(defaultElementId);
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
            defaultElement.leonardoElementId,           // ID do Element Leonardo
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