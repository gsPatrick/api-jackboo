// src/models/DatasetImage.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class DatasetImage extends Model {
    static associate(models) {
      this.belongsTo(models.LeonardoDataset, {
        foreignKey: 'datasetId',
        as: 'dataset',
      });
    }
  }

  DatasetImage.init({
    // ID único da imagem retornado pela API da Leonardo.AI.
    leonardoImageId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: 'leonardo_image_id',
    },
    // Chave estrangeira para o nosso dataset local.
    datasetId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'dataset_id',
      references: {
        model: 'leonardo_datasets',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
  }, {
    sequelize,
    modelName: 'DatasetImage',
    tableName: 'dataset_images',
    timestamps: true,
    underscored: true,
  });

  return DatasetImage;
};