'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class OpenAISetting extends Model {
    static associate(models) {
      this.belongsToMany(models.AdminAsset, {
        through: 'OpenAISettingAsset',
        foreignKey: 'openAISettingId',
        otherKey: 'adminAssetId',
        as: 'baseAssets'
      });
    }
  }

  OpenAISetting.init({
    type: {
      type: DataTypes.STRING, // Alterado de ENUM para STRING para mais flexibilidade
      allowNull: false,
      unique: true,
    },
    basePromptText: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    model: {
      type: DataTypes.STRING,
      defaultValue: 'dall-e-3'
    },
    size: {
      type: DataTypes.STRING,
      defaultValue: '1024x1024'
    },
    quality: {
      type: DataTypes.ENUM('standard', 'hd'),
      defaultValue: 'standard'
    },
    style: {
      type: DataTypes.ENUM('vivid', 'natural'),
      defaultValue: 'vivid'
    },
    maxImageDescriptions: {
      type: DataTypes.INTEGER,
      defaultValue: 5
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    }
  }, {
    sequelize,
    modelName: 'OpenAISetting',
    tableName: 'openai_settings',
    timestamps: true,
    underscored: true,
  });

  return OpenAISetting;
};