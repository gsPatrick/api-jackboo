'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Subscription extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      this.belongsTo(models.Plan, { foreignKey: 'planId', as: 'plan' });
    }
  }

  Subscription.init({
    status: {
      type: DataTypes.ENUM('active', 'canceled', 'expired', 'paused', 'pending'), // Adicionado 'pending'
      allowNull: false,
    },
    nextBillingDate: {
      type: DataTypes.DATE,
      allowNull: true, // Pode ser nulo se for cancelada ou pendente
    },
    gatewaySubscriptionId: {
      type: DataTypes.STRING,
      allowNull: true,
    }
  }, {
    sequelize,
    modelName: 'Subscription',
    tableName: 'subscriptions',
    timestamps: false, // Este modelo não tinha timestamps
  });

  return Subscription;
};