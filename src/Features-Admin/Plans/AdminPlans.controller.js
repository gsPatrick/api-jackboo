const adminPlansService = require('./AdminPlans.service');

class AdminPlansController {
  async listAll(req, res) {
    try {
      const plans = await adminPlansService.listAllPlans();
      res.status(200).json(plans);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao listar planos.', error: error.message });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const plan = await adminPlansService.findPlanById(id);
      res.status(200).json(plan);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }

  async create(req, res) {
    try {
      const plan = await adminPlansService.createPlan(req.body);
      res.status(201).json(plan);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const plan = await adminPlansService.updatePlan(id, req.body);
      res.status(200).json(plan);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      const result = await adminPlansService.deletePlan(id);
      res.status(200).json(result);
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  }
}

module.exports = new AdminPlansController();
