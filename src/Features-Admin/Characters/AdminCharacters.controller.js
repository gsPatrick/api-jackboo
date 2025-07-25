// src/Features-Admin/Characters/AdminCharacter.controller.js
const AdminCharacterService = require('./AdminCharacter.service');

class AdminCharacterController {
    async listOfficialCharacters(req, res, next) {
        try {
            const result = await AdminCharacterService.listOfficialCharacters();
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }
    
    // MODIFICADO: Extrai o elementId do corpo
    async createOfficialCharacter(req, res, next) {
        try {
            const { elementId } = req.body;
            const character = await AdminCharacterService.createOfficialCharacter(req.file, { elementId });
            res.status(202).json(character);
        } catch (error) {
            next(error);
        }
    }

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