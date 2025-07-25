// src/Features-Admin/AIHelper/AdminAIHelper.controller.js
const AdminAIHelperService = require('./AIHelper.service');

class AdminAIHelperController {
  async generateText(req, res, next) {
    try {
      const { prompt } = req.body;
      if(!prompt) {
          return res.status(400).json({ message: 'O campo "prompt" é obrigatório.' });
      }
      const generatedText = await AdminAIHelperService.generateText(prompt);
      res.status(200).json({ text: generatedText });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminAIHelperController();