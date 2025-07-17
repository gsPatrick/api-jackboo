'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Plan extends Model {
    static associate(models) {
      this.hasMany(models.Subscription, { foreignKey: 'planId', as: 'subscriptions' });
    }
  }

  Plan.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    frequency: {
      type: DataTypes.ENUM('monthly', 'yearly'),
      allowNull: false,
    },
    benefits: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    gatewayPlanId: {
      type: DataTypes.STRING,
      allowNull: true,
    }
  }, {
    sequelize,
    modelName: 'Plan',
    tableName: 'plans',
    timestamps: false, // Este modelo não tinha timestamps
  });

  return Plan;
};