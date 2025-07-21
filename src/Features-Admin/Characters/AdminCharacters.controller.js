// src/Features-Admin/Characters/AdminCharacters.controller.js
const adminCharactersService = require('./AdminCharacters.service');

class AdminCharactersController {
  async list(req, res, next) {
    try {
      const characters = await adminCharactersService.listOfficialCharacters();
      res.status(200).json(characters);
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      // O req.user.id aqui seria o do admin logado, mas o serviço sempre usa o SYSTEM_USER_ID.
      const character = await adminCharactersService.createOfficialCharacter(req.body, req.file);
      res.status(201).json(character);
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const character = await adminCharactersService.updateOfficialCharacter(id, req.body, req.file);
      res.status(200).json(character);
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      await adminCharactersService.deleteOfficialCharacter(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminCharactersController();