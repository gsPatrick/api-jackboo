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
    
    // Controller para GERAÇÃO COMPLETA via IA
    async createOfficialCharacter(req, res, next) {
        try {
            // Este fluxo não precisa de 'name' no body, apenas o arquivo do desenho
            const character = await AdminCharacterService.createOfficialCharacter(req.file);
            // Retorna 202 Accepted pois a geração completa é um processo longo
            res.status(202).json(character);
        } catch (error) {
            next(error);
        }
    }

    // Controller para o fluxo de upload direto.
    async createOfficialCharacterByUpload(req, res, next) {
        try {
            const { name } = req.body;
            const character = await AdminCharacterService.createOfficialCharacterByUpload(name, req.file);
            res.status(202).json(character);
        } catch (error) {
            next(error);
        }
    }

    async deleteOfficialCharacter(req, res, next) {
        try {
            const { id } = req.params;
            const result = await AdminCharacterService.deleteOfficialCharacter(id);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AdminCharacterController();