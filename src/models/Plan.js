const { Model, DataTypes } = require('sequelize');

class Plan extends Model {
  static init(sequelize) {
    super.init({
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
        comment: 'ID do plano no gateway de pagamento (ex: Stripe).'
      }
    }, {
      sequelize,
      tableName: 'plans',
    });
  }

  static associate(models) {
    this.hasMany(models.Subscription, { foreignKey: 'planId', as: 'subscriptions' });
  }
}

module.exports = Plan;