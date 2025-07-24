// src/models/OpenAISetting.js
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

      // --- NOVA ASSOCIAÇÃO ---
      // Um template pode ter um "template ajudante"
      this.belongsTo(models.OpenAISetting, {
        foreignKey: 'helperPromptId',
        as: 'helperPrompt',
        allowNull: true
      });
    }
  }

  OpenAISetting.init({
    type: { type: DataTypes.STRING, allowNull: false, unique: true },
    name: { type: DataTypes.STRING, allowNull: false }, // Adicionando o campo nome que faltava
    basePromptText: { type: DataTypes.TEXT, allowNull: false },
    model: { type: DataTypes.STRING, defaultValue: 'dall-e-3' },
    size: { type: DataTypes.STRING, defaultValue: '1024x1024' },
    quality: { type: DataTypes.ENUM('standard', 'hd'), defaultValue: 'standard' },
    style: { type: DataTypes.ENUM('vivid', 'natural'), defaultValue: 'vivid' },
    maxImageDescriptions: { type: DataTypes.INTEGER, defaultValue: 5 },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    
    // --- NOVO CAMPO ---
    helperPromptId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'openai_settings', // Auto-referência à mesma tabela
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
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