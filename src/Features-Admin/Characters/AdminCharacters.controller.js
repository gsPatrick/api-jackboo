// src/Features-Admin/Characters/AdminCharacter.controller.js
const AdminCharacterService = require('./AdminCharacters.service');
// ❌ O ContentService não é mais necessário aqui.

class AdminCharacterController {
    
    async listOfficialCharacters(req, res, next) {
        try {
            const result = await AdminCharacterService.listOfficialCharacters();
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    async createOfficialCharacterByUpload(req, res, next) {
        try {
            if (!req.file) throw new Error("Nenhum arquivo de imagem foi enviado.");
            const character = await AdminCharacterService.createCharacterByUpload(req.file, req.body);
            res.status(201).json(character);
        } catch (error) {
            next(error);
        }
    }

    // ✅ CORREÇÃO DEFINITIVA: Agora chama a função correta do AdminCharacterService,
    // que sabe o caminho certo para os assets do admin.
    async createOfficialCharacterWithIA(req, res, next) {
        try {
            if (!req.file) throw new Error("Nenhum arquivo de desenho foi enviado.");
            // Chama o serviço do ADMIN, não o do usuário.
            const character = await AdminCharacterService.createCharacterWithIA(req.file);
            res.status(202).json(character); // 202 Accepted, pois o processo é assíncrono
        } catch (error) {
            next(error);
        }
    }

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