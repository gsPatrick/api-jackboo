// src/Features-Admin/BookTemplates/AdminBookTemplates.controller.js
const adminService = require('./AdminBookTemplates.service');

class AdminBookTemplatesController {
  // --- BookTemplate Controllers ---
  async createBookTemplate(req, res) {
    try {
      const template = await adminService.createBookTemplate(req.body);
      res.status(201).json(template);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async listBookTemplates(req, res) {
    try {
      const result = await adminService.listBookTemplates(req.query);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao listar templates de livro.', error: error.message });
    }
  }

  async getBookTemplateById(req, res) {
    try {
      const { id } = req.params;
      const template = await adminService.getBookTemplateById(id);
      res.status(200).json(template);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }

  async updateBookTemplate(req, res) {
    try {
      const { id } = req.params;
      const template = await adminService.updateBookTemplate(id, req.body);
      res.status(200).json(template);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async deleteBookTemplate(req, res) {
    try {
      const { id } = req.params;
      const result = await adminService.deleteBookTemplate(id);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  // --- PageTemplate Controllers ---
  async createPageTemplate(req, res) {
    try {
      // O ID do BookTemplate vem da URL
      const { bookTemplateId } = req.params;
      const page = await adminService.createPageTemplate(bookTemplateId, req.body);
      res.status(201).json(page);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async updatePageTemplate(req, res) {
    try {
      const { pageId } = req.params;
      const page = await adminService.updatePageTemplate(pageId, req.body);
      res.status(200).json(page);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async deletePageTemplate(req, res) {
    try {
      const { pageId } = req.params;
      await adminService.deletePageTemplate(pageId);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
}

module.exports = new AdminBookTemplatesController();