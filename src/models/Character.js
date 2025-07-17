'use strict';
const { Model } = require('sequelize');
const { deleteFile } = require('../Utils/fileHelper');

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
    }
  }, {
    sequelize,
    modelName: 'Character',
    tableName: 'characters',
    timestamps: false, // Este modelo não tinha timestamps
  });

  return Character;
};