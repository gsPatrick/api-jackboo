// src/models/LeonardoDataset.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LeonardoDataset extends Model {
     static associate(models) {
      // UM DATASET TEM MUITAS IMAGENS
      this.hasMany(models.DatasetImage, {
        foreignKey: 'datasetId',
        as: 'images'
      });
    }
  }
  LeonardoDataset.init({
    // ID único retornado pela API da Leonardo.AI ao criar o dataset.
    leonardoDatasetId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'leonardo_dataset_id',
    },
    // Nome do dataset para exibição no nosso painel de admin.
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // Para podermos "desativar" um dataset sem deletá-lo.
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active',
    }
  }, {
    sequelize,
    modelName: 'LeonardoDataset',
    tableName: 'leonardo_datasets',
    timestamps: true,
    underscored: true,
  });

  return LeonardoDataset;
};