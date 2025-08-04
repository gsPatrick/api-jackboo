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
    // ✅ ATUALIZADO: Renomeado para basePromptText para consistência
    basePromptText: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Prompt base para geração de imagens usando este Element. Usará {{GPT_OUTPUT}} como placeholder para o texto gerado pelo GPT.'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // ✅ REMOVIDO: Campo duplicado ou que não será mais usado diretamente
    // basePrompt: {
    //     type: DataTypes.TEXT,
    //     allowNull: true,
    //     comment: 'Prompt de base para o Leonardo.AI. Usará {{GPT_OUTPUT}} como placeholder.'
    // },
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