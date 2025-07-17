const taxonomyService = require('./AdminTaxonomies.service');

class AdminTaxonomiesController {
  // --- Category Controllers ---
  async createCategory(req, res) {
    try {
      const category = await taxonomyService.createCategory(req.body);
      res.status(201).json(category);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async listCategories(req, res) {
    try {
      const categories = await taxonomyService.listCategories();
      res.status(200).json(categories);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async updateCategory(req, res) {
    try {
      const category = await taxonomyService.updateCategory(req.params.id, req.body);
      res.status(200).json(category);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }

  async deleteCategory(req, res) {
    try {
      await taxonomyService.deleteCategory(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  // --- AgeRating Controllers ---
  async createAgeRating(req, res) {
    try {
      const ageRating = await taxonomyService.createAgeRating(req.body);
      res.status(201).json(ageRating);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async listAgeRatings(req, res) {
    try {
      const ageRatings = await taxonomyService.listAgeRatings();
      res.status(200).json(ageRatings);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async updateAgeRating(req, res) {
    try {
      const ageRating = await taxonomyService.updateAgeRating(req.params.id, req.body);
      res.status(200).json(ageRating);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }

  async deleteAgeRating(req, res) {
    try {
      await taxonomyService.deleteAgeRating(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
  async listAllAiSettings(req, res) {
    try {
      const settings = await taxonomyService.listAllAiSettings();
      res.status(200).json(settings);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao listar configurações de IA.', error: error.message });
    }
  }

 // --- NOVO: Controllers para PrintFormat ---
  async createPrintFormat(req, res) {
    try {
      const format = await taxonomyService.createPrintFormat(req.body);
      res.status(201).json(format);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async listPrintFormats(req, res) {
    try {
      const formats = await taxonomyService.listPrintFormats();
      res.status(200).json(formats);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }

  async updatePrintFormat(req, res) {
    try {
      const format = await taxonomyService.updatePrintFormat(req.params.id, req.body);
      res.status(200).json(format);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }

  async deletePrintFormat(req, res) {
    try {
      await taxonomyService.deletePrintFormat(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

}

module.exports = new AdminTaxonomiesController();