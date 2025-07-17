const adminCharactersService = require('./AdminCharacters.service');

class AdminCharactersController {
  async list(req, res) {
    try {
      const characters = await adminCharactersService.listOfficialCharacters();
      res.status(200).json(characters);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async create(req, res) {
    try {
      const character = await adminCharactersService.createOfficialCharacter(req.body, req.file);
      res.status(201).json(character);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const character = await adminCharactersService.updateOfficialCharacter(id, req.body, req.file);
      res.status(200).json(character);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      await adminCharactersService.deleteOfficialCharacter(id);
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }
}

module.exports = new AdminCharactersController();   