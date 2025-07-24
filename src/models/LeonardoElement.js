// src/models/LeonardoElement.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LeonardoElement extends Model {
    static associate(models) {
      this.belongsTo(models.LeonardoDataset, {
        foreignKey: 'sourceDatasetId',
        as: 'sourceDataset',
      });
    }
  }

  LeonardoElement.init({
    leonardoElementId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'leonardo_element_id',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
        type: DataTypes.STRING,
        defaultValue: 'PENDING',
    },
    sourceDatasetId: {
      type: DataTypes.INTEGER,
      // --- CORREÇÃO AQUI ---
      allowNull: true, // Permitir que seja nulo
      field: 'source_dataset_id',
      references: {
        model: 'leonardo_datasets',
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'LeonardoElement',
    tableName: 'leonardo_elements',
    timestamps: true,
    underscored: true,
  });

  return LeonardoElement;
};