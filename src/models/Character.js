// src/models/Character.js
'use strict';
const { Model } = require('sequelize');
const { deleteFile } = require('../Utils/FileHelper');

module.exports = (sequelize, DataTypes) => {
  class Character extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'userId', as: 'creator' });
      this.hasMany(models.Book, { foreignKey: 'mainCharacterId', as: 'booksAsMainCharacter' });
    }

    static addHooks() {
      this.afterDestroy(async (character, options) => {
        console.log(`[Hook] Deletando arquivos para o personagem ${character.id}`);
        await deleteFile(character.originalDrawingUrl);
        await deleteFile(character.generatedCharacterUrl);
      });
    }
  }

  Character.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    originalDrawingUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    generatedCharacterUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    traits: {
        type: DataTypes.JSONB,
        allowNull: true,
    },
    generationJobId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'ID do job de geração retornado pela API (Leonardo/Replicate).'
    } 
  }, {
    sequelize,
    modelName: 'Character',
    tableName: 'characters',
    underscored: true, // Adiciona underscored para garantir que createdAt vire created_at
    // A linha "timestamps: false," foi REMOVIDA.
    // Agora o Sequelize vai gerenciar createdAt e updatedAt.
  });

  return Character;
};