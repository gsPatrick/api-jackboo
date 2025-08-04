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
    purpose: {
      // ✅ ATUALIZADO: Valores do ENUM para refletir os propósitos específicos de cada prompt GPT.
      type: DataTypes.ENUM(
        'USER_CHARACTER_DRAWING',         // Para o GPT descrever o desenho do personagem do usuário
        'USER_COLORING_BOOK_STORYLINE',   // Para o GPT gerar o roteiro do livro de colorir
        'USER_STORY_BOOK_STORYLINE',      // Para o GPT gerar o roteiro do livro de história
        'BOOK_COVER_DESCRIPTION_GPT'      // Para o GPT gerar a descrição textual de capas/contracapas
      ),
      allowNull: false,
      unique: true,
      comment: 'Identificador único do propósito do template. Define a função do prompt do SISTEMA GPT.'
    },
    basePromptText: {
      type: DataTypes.TEXT,
      allowNull: false,
      // ✅ ATUALIZADO: Comentário para clareza
      comment: 'O texto principal do prompt do SISTEMA GPT para este propósito. Pode conter placeholders como [CHARACTER_DETAILS], [BOOK_TITLE], etc.'
    },
    defaultElementId: {
      type: DataTypes.STRING, // IDs do Leonardo são strings
      allowNull: true,
      // ✅ ATUALIZADO: Comentário para clareza
      comment: 'ID do LeonardoElement (LoRA) principal, usado para o miolo do livro ou geração de personagem. Define o ESTILO da imagem.'
    },
    coverElementId: {
      type: DataTypes.STRING, // IDs do Leonardo são strings
      allowNull: true,
      // ✅ ATUALIZADO: Comentário para clareza
      comment: 'ID do LeonardoElement (LoRA) para capa e contracapa. Define o ESTILO da imagem da capa.'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Controla se esta configuração de IA está ativa e pode ser usada.'
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