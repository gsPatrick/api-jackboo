'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class PrintFormat extends Model {
    static associate(models) {
      this.hasMany(models.Book, { foreignKey: 'printFormatId', as: 'books' });
    }
  }

  PrintFormat.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    coverWidth: { type: DataTypes.FLOAT, allowNull: false },
    coverHeight: { type: DataTypes.FLOAT, allowNull: false },
    pageWidth: { type: DataTypes.FLOAT, allowNull: false },
    pageHeight: { type: DataTypes.FLOAT, allowNull: false },
    margin: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 1.5 },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
  }, {
    sequelize,
    modelName: 'PrintFormat',
    tableName: 'print_formats',
    timestamps: true,
    underscored: true
  });

  return PrintFormat;
};