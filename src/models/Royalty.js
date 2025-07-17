'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Royalty extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'authorId', as: 'author' });
      this.belongsTo(models.OrderItem, { foreignKey: 'orderItemId', as: 'sourceSale' });
    }
  }

  Royalty.init({
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
    modelName: 'Royalty',
    tableName: 'royalties',
    timestamps: false, // Este modelo não tinha timestamps
  });

  return Royalty;
};