'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BookVariation extends Model {
    static associate(models) {
      this.belongsTo(models.Book, { foreignKey: 'bookId', as: 'book' });
      this.hasMany(models.OrderItem, { foreignKey: 'bookVariationId', as: 'orderItems' });
    }
  }

  BookVariation.init({
    type: {
      type: DataTypes.ENUM('historia', 'colorir'),
      allowNull: false,
    },
    format: {
      type: DataTypes.ENUM('physical', 'digital_pdf'),
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    coverUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    pageCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    bgColor: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isAvailable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    contentJson: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'BookVariation',
    tableName: 'book_variations',
    timestamps: false, // Este modelo não tinha timestamps
  });

  return BookVariation;
};