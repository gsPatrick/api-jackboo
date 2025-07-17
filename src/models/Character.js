const { Model, DataTypes } = require('sequelize');
const { deleteFile } = require('../Utils/fileHelper'); // <-- IMPORTAR


class Character extends Model {
  static init(sequelize) {
    super.init({
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      originalDrawingUrl: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'URL da imagem do desenho original enviado pelo usuário ou admin.'
      },
      generatedCharacterUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL da imagem do personagem gerado pelo sistema (IA).'
      },
      description: {
          type: DataTypes.TEXT,
          allowNull: true,
          comment: 'Uma breve descrição do personagem, suas qualidades, etc.'
      },
      traits: {
          type: DataTypes.JSONB,
          allowNull: true,
          comment: 'Armazena características como {"cor": "azul", "poder": "voar"}.'
      }
    }, {
      sequelize,
      tableName: 'characters',
    });
  }

  static associate(models) {
    this.belongsTo(models.User, { foreignKey: 'userId', as: 'creator' });
    this.hasMany(models.Book, { foreignKey: 'mainCharacterId', as: 'booksAsMainCharacter' });
  }

    static addHooks(models) {
    this.afterDestroy(async (character, options) => {
      console.log(`[Hook] Deletando arquivos para o personagem ${character.id}`);
      await deleteFile(character.originalDrawingUrl);
      await deleteFile(character.generatedCharacterUrl);
    });
  }
}

module.exports = Character;