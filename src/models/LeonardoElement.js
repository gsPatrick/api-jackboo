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
    // ✅ CAMPO ADICIONADO: Para armazenar o prompt base associado a este Element.
    basePromptText: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Prompt base para geração de imagens usando este Element.'
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
      allowNull: true,
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