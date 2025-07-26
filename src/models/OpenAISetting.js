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
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Identificador único do template. Ex: USER_story_book_generation, INTERNAL_character_description'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nome amigável para exibição no painel de administração.'
    },
    basePromptText: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'O texto principal do prompt a ser enviado para a IA.'
    },
    model: {
      type: DataTypes.STRING,
      defaultValue: 'gpt-4o',
      comment: 'Modelo de IA a ser usado (ex: gpt-4o).'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Controla se este template pode ser usado pelo sistema.'
    },
    helperPromptId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'openai_settings', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    },
    defaultElementId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID do Element (LoRA) principal, usado para o miolo do livro ou geração de personagem.'
    },
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