'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProductStock extends Model {
    static associate(models) {
      this.belongsTo(models.BookVariation, {
        foreignKey: 'variationId',
        as: 'variation',
      });
    }
  }

  ProductStock.init({
    variationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'book_variations',
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE',
      unique: true,
    },
    available: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    reserved: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    sequelize,
    modelName: 'ProductStock',
    tableName: 'product_stocks',
    timestamps: true,
    underscored: true,
  });

  return ProductStock;
};