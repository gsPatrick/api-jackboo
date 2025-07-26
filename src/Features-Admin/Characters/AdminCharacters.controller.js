// src/Features-Admin/Characters/AdminCharacter.controller.js
const AdminCharacterService = require('./AdminCharacters.service');
const ContentService = require('../../Features/Content/Content.service'); // Importa o serviço do usuário

class AdminCharacterController {
    
 // ✅ CORREÇÃO: Agora chama a função correta do AdminCharacterService.
    async createOfficialCharacterWithIA(req, res, next) {
        try {
            if (!req.file) throw new Error("Nenhum arquivo de desenho foi enviado.");
            const character = await AdminCharacterService.createCharacterWithIA(req.file);
            res.status(202).json(character); // 202 Accepted, pois o processo é assíncrono
        } catch (error) {
            next(error);
        }
    }

    // Usa o serviço do admin para listar apenas personagens oficiais
    async listOfficialCharacters(req, res, next) {
        try {
            const result = await AdminCharacterService.listOfficialCharacters();
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    // Usa o serviço do admin para o upload direto
    async createOfficialCharacterByUpload(req, res, next) {
        try {
            if (!req.file) throw new Error("Nenhum arquivo de imagem foi enviado.");
            const character = await AdminCharacterService.createCharacterByUpload(req.file, req.body);
            res.status(201).json(character);
        } catch (error) {
            next(error);
        }
    }

    // --- CORREÇÃO AQUI: Usa o ContentService para a geração com IA ---
    // O admin (req.user.id) é tratado como qualquer outro usuário pelo ContentService
    async createOfficialCharacterWithIA(req, res, next) {
        try {
            if (!req.file) throw new Error("Nenhum arquivo de desenho foi enviado.");
            // O ContentService já está preparado para receber o ID do usuário logado (que é o admin)
            const character = await ContentService.createCharacter(req.user.id, req.file);
            res.status(202).json(character); // 202 Accepted, pois o processo é assíncrono
        } catch (error) {
            next(error);
        }
    }

    // Usa o serviço do admin para deletar
    async deleteOfficialCharacter(req, res, next) {
        try {
            const { id } = req.params;
            const result = await AdminCharacterService.deleteCharacter(id);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AdminCharacterController();