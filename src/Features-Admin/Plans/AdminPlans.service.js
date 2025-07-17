const { Plan } = require('../../models');

class AdminPlansService {
  async listAllPlans() {
    return Plan.findAll({ order: [['price', 'ASC']] });
  }

  async findPlanById(id) {
    const plan = await Plan.findByPk(id);
    if (!plan) throw new Error('Plano não encontrado.');
    return plan;
  }

  async createPlan(planData) {
    // Validações básicas
    if (!planData.name || !planData.price || !planData.frequency) {
      throw new Error('Nome, preço e frequência são campos obrigatórios para o plano.');
    }
    return Plan.create(planData);
  }

  async updatePlan(id, updateData) {
    const plan = await this.findPlanById(id);
    await plan.update(updateData);
    return plan;
  }

  async deletePlan(id) {
    const plan = await this.findPlanById(id);
    // TODO: Adicionar verificação para planos com assinaturas ativas
    const activeSubscriptions = await plan.countSubscriptions({ where: { status: 'active' } });
    if (activeSubscriptions > 0) {
        throw new Error(`Não é possível deletar este plano, pois ele possui ${activeSubscriptions} assinaturas ativas.`);
    }
    await plan.destroy();
    return { message: 'Plano deletado com sucesso.' };
  }
}

module.exports = new AdminPlansService();
