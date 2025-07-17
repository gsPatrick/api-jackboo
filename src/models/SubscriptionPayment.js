// src/models/SubscriptionPayment.js
const { Model, DataTypes } = require('sequelize');

class SubscriptionPayment extends Model {
  static init(sequelize) {
    super.init({
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Valor pago nesta transação.'
      },
      paymentDate: {
        type: DataTypes.DATE,
        allowNull: false,
        comment: 'Data em que o pagamento foi efetuado.'
      },
      status: {
        type: DataTypes.ENUM('paid', 'failed'),
        allowNull: false,
        comment: 'Status do pagamento específico.'
      },
      gatewayPaymentId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'ID do pagamento no gateway (ex: Mercado Pago).'
      },
      invoiceUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL da fatura ou comprovante no gateway.'
      }
    }, {
      sequelize,
      tableName: 'subscription_payments',
      timestamps: true,
      underscored: true
    });
  }

  static associate(models) {
    this.belongsTo(models.Subscription, { foreignKey: 'subscriptionId', as: 'subscription' });
  }
}

module.exports = SubscriptionPayment;