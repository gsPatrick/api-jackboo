const subscriptionService = require('./Subscription.service');

module.exports = {
  async initiateSubscription(req, res) {
    try {
      const { planId } = req.body;
      const checkoutUrl = await subscriptionService.initiateSubscription(req.user.id, planId);
      res.status(200).json({ checkoutUrl });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  async cancelSubscription(req, res) {
    try {
      await subscriptionService.cancelUserSubscription(req.user.id);
      res.status(200).json({ message: 'Assinatura cancelada com sucesso.' });
    } catch (error) {
      res.status(400).json({ message: error.message });
    }
  },

  async getMySubscription(req, res) {
    try {
      const subscription = await subscriptionService.getUserSubscription(req.user.id);
      if (!subscription) {
        return res.status(404).json({ message: 'Nenhuma assinatura ativa encontrada.' });
      }
      res.status(200).json(subscription);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  async getUserSubscriptionPaymentHistory(req, res) {
    try {
      const payments = await subscriptionService.getSubscriptionPaymentHistory(req.user.id);
      res.status(200).json(payments);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
};
