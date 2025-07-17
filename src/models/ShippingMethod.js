'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ShippingMethod extends Model {
    static associate(models) {
      // No associations
    }
  }

  ShippingMethod.init({
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.STRING },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    deliveryTime: { type: DataTypes.STRING, allowNull: false },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, {
    sequelize,
    modelName: 'ShippingMethod',
    tableName: 'shipping_methods',
    timestamps: false, // Este modelo não tinha timestamps
  });

  return ShippingMethod;
};