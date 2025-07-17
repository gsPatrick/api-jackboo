const { Model, DataTypes } = require('sequelize');

class Royalty extends Model {
  static init(sequelize) {
    super.init({
      commissionAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      status: {
        type: DataTypes.ENUM('pending', 'paid_out', 'canceled'),
        defaultValue: 'pending',
        allowNull: false,
      },
      paymentDate: {
        type: DataTypes.DATE,
        allowNull: true,
      },
    }, {
      sequelize,
      tableName: 'royalties',
    });
  }

  static associate(models) {
    this.belongsTo(models.User, { foreignKey: 'authorId', as: 'author' });
    this.belongsTo(models.OrderItem, { foreignKey: 'orderItemId', as: 'sourceSale' });
  }
}

module.exports = Royalty;