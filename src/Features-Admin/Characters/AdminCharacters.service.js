// src/Features-Admin/Characters/AdminCharacter.service.js
const { Character } = require('../../models');
const contentService = require('../../Features/Content/Content.service');

// ✅ NOVO: Importando os módulos 'fs' (File System) e 'path' do Node.js para mover o arquivo.
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
        
        // --- ✅ LÓGICA DE MOVIMENTAÇÃO DE ARQUIVO ADICIONADA ---

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
        
        // --- FIM DA LÓGICA DE MOVIMENTAÇÃO ---


        // ✅ ALTERADO: Usa a nova URL final para salvar no banco de dados.
        return Character.create({
            userId: ADMIN_USER_ID,
            name: data.name,
            description: data.description,
            // O "desenho original" e a "imagem gerada" são a mesma para upload direto.
            originalDrawingUrl: finalImageUrl, 
            generatedCharacterUrl: finalImageUrl,
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