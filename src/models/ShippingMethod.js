const { Model, DataTypes } = require('sequelize');

class ShippingMethod extends Model {
  static init(sequelize) {
    super.init({
      name: { type: DataTypes.STRING, allowNull: false }, // Ex: "Entrega Rápida JackBoo"
      description: { type: DataTypes.STRING },
      price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      deliveryTime: { type: DataTypes.STRING, allowNull: false }, // Ex: "3-5 dias úteis"
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
    }, {
      sequelize,
      tableName: 'shipping_methods',
    });
  }
}
module.exports = ShippingMethod;