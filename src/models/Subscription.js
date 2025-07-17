const { Model, DataTypes } = require('sequelize');

class Subscription extends Model {
  static init(sequelize) {
    super.init({
      status: {
        type: DataTypes.ENUM('active', 'canceled', 'expired', 'paused'),
        allowNull: false,
      },
      nextBillingDate: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      gatewaySubscriptionId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'ID da assinatura no gateway de pagamento.'
      }
    }, {
      sequelize,
      tableName: 'subscriptions',
    });
  }

  static associate(models) {
    this.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    this.belongsTo(models.Plan, { foreignKey: 'planId', as: 'plan' });
  }
}

module.exports = Subscription;