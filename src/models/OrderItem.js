const { Model, DataTypes } = require('sequelize');

class OrderItem extends Model {
  static init(sequelize) {
    super.init({
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      unitPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      // O campo 'type' (physical/digital) foi movido para BookVariation,
      // pois agora está atrelado à variação.
    }, {
      sequelize,
      tableName: 'order_items',
    });
  }

  static associate(models) {
    this.belongsTo(models.Order, { foreignKey: 'orderId', as: 'order' });
    // ATUALIZADO: Agora se relaciona com BookVariation
    this.belongsTo(models.BookVariation, { foreignKey: 'bookVariationId', as: 'variation' });
  }
}

module.exports = OrderItem;