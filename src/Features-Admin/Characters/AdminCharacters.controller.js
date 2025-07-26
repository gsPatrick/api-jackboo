// src/Features-Admin/Characters/AdminCharacter.controller.js
const AdminCharacterService = require('./AdminCharacters.service');

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
            // O serviço já espera o 'req.body' que contém nome e descrição.
            const character = await AdminCharacterService.createCharacterByUpload(req.file, req.body);
            res.status(201).json(character);
        } catch (error) {
            next(error);
        }
    }

    async createOfficialCharacterWithIA(req, res, next) {
        try {
            if (!req.file) throw new Error("Nenhum arquivo de desenho foi enviado.");
            // ✅ CORREÇÃO: Pega o nome do corpo do formulário.
            const { name } = req.body;
            if (!name) throw new Error("O nome do personagem é obrigatório.");
            
            // ✅ CORREÇÃO: Passa o nome para o serviço.
            const character = await AdminCharacterService.createCharacterWithIA(req.file, name);
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