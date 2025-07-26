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
      this.belongsTo(models.OpenAISetting, {
        foreignKey: 'helperPromptId',
        as: 'helperPrompt',
        allowNull: true
      });
    }
  }

  OpenAISetting.init({
    type: { type: DataTypes.STRING, allowNull: false, unique: true },
    name: { type: DataTypes.STRING, allowNull: false },
    basePromptText: { type: DataTypes.TEXT, allowNull: false },
    model: { type: DataTypes.STRING, defaultValue: 'gpt-4o' },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    helperPromptId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'openai_settings', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    // ID do Element para o CONTEÚDO/MIOLO do livro
    defaultElementId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID do Element (LoRA) principal, usado para o miolo do livro.'
    },
    // NOVO CAMPO: ID do Element para a CAPA
    coverElementId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID do Element (LoRA) da capa, usado para a capa e contracapa.'
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