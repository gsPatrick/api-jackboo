'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class SubscriptionPayment extends Model {
    static associate(models) {
      this.belongsTo(models.Subscription, { foreignKey: 'subscriptionId', as: 'subscription' });
    }
  }

  SubscriptionPayment.init({
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    paymentDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('paid', 'failed'),
      allowNull: false,
    },
    gatewayPaymentId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    invoiceUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    }
  }, {
    sequelize,
    modelName: 'SubscriptionPayment',
    tableName: 'subscription_payments',
    timestamps: true,
    underscored: true
  });

  return SubscriptionPayment;
};