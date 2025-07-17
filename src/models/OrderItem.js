'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class OrderItem extends Model {
    static associate(models) {
      this.belongsTo(models.Order, { foreignKey: 'orderId', as: 'order' });
      this.belongsTo(models.BookVariation, { foreignKey: 'bookVariationId', as: 'variation' });
    }
  }

  OrderItem.init({
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'OrderItem',
    tableName: 'order_items',
    timestamps: false, // Este modelo não tinha timestamps
  });

  return OrderItem;
};