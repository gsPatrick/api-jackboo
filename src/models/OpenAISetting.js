// src/models/OpenAISetting.js
'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class OpenAISetting extends Model {
    static associate(models) {
      // Associações podem ser mantidas se necessárias no futuro
    }
  }

  OpenAISetting.init({
    // ✅ CORREÇÃO: 'type' foi substituído por 'purpose' com opções pré-definidas.
    purpose: {
      type: DataTypes.ENUM(
        'USER_CHARACTER_DESCRIPTION',
        'USER_CHARACTER_DRAWING',
        'USER_COLORING_BOOK_GENERATION',
        'USER_STORY_BOOK_GENERATION'
      ),
      allowNull: false,
      unique: true,
      comment: 'Identificador único do propósito do template.'
    },
    basePromptText: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: 'O texto principal do prompt a ser enviado para a IA.'
    },
    defaultElementId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID do Element (LoRA) principal, usado para o miolo ou geração.'
    },
    coverElementId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID do Element (LoRA) da capa, usado para capa e contracapa.'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Controla se este template pode ser usado pelo sistema.'
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