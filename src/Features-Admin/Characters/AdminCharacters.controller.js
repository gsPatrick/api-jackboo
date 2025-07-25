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
    
    async createOfficialCharacter(req, res, next) {
        try {
            // Extrai os tipos dos templates do corpo da requisição
            const { descriptionTemplateType, drawingTemplateType } = req.body;
            const character = await AdminCharacterService.createOfficialCharacter(req.file, { descriptionTemplateType, drawingTemplateType });
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