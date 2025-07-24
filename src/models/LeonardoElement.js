// src/models/LeonardoElement.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LeonardoElement extends Model {
    static associate(models) {
      // Associação com o dataset usado para o treinamento
      this.belongsTo(models.LeonardoDataset, {
        foreignKey: 'sourceDatasetId',
        as: 'sourceDataset',
      });
    }
  }

  LeonardoElement.init({
    // ID único retornado pela API da Leonardo.AI ao criar o elemento.
    leonardoElementId: {
      type: DataTypes.STRING, // O ID do elemento pode ser uma string
      allowNull: false,
      unique: true,
      field: 'leonardo_element_id',
    },
    // Nome do elemento para exibição no nosso painel.
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Para registrar o status do treinamento (ex: PENDING, COMPLETE, FAILED)
    status: {
        type: DataTypes.STRING,
        defaultValue: 'PENDING',
    },
    // Referência ao nosso dataset local que foi usado para o treinamento.
    sourceDatasetId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'source_dataset_id',
      references: {
        model: 'leonardo_datasets', // nome da tabela
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