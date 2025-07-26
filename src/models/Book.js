'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Book extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'authorId', as: 'author' });
      this.belongsTo(models.Character, { foreignKey: 'mainCharacterId', as: 'mainCharacter' });
      this.belongsTo(models.Category, { foreignKey: 'categoryId', as: 'category' });
      this.belongsTo(models.AgeRating, { foreignKey: 'ageRatingId', as: 'ageRating' });
      this.belongsTo(models.PrintFormat, { foreignKey: 'printFormatId', as: 'printFormat' });
      this.hasMany(models.BookPage, { foreignKey: 'bookId', as: 'pages', onDelete: 'CASCADE' });
      this.hasMany(models.Book, { foreignKey: 'seriesParentId', as: 'sequels' });
      this.belongsTo(models.Book, { foreignKey: 'seriesParentId', as: 'seriesParent' });
      this.hasMany(models.BookVariation, { foreignKey: 'bookId', as: 'variations' });
      this.hasMany(models.Like, { foreignKey: 'bookId', as: 'likes' });
      
      // NOVA ASSOCIAÇÃO "MUITOS PARA MUITOS"
      this.belongsToMany(models.Character, {
        through: models.BookCharacter,
        foreignKey: 'bookId',
        otherKey: 'characterId',
        as: 'characters'
      });
    }
  }

  Book.init({
    title: { type: DataTypes.STRING, allowNull: false },
    seriesParentId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'books', key: 'id' } },
    genre: { type: DataTypes.STRING, allowNull: true },
    storyPrompt: { type: DataTypes.JSONB, allowNull: true },
    status: { type: DataTypes.ENUM('privado', 'publicado', 'pendente', 'gerando', 'falha_geracao'), defaultValue: 'gerando', allowNull: false },
    finalPdfUrl: { type: DataTypes.STRING, allowNull: true },
    categoryId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'categories', key: 'id' } },
    ageRatingId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'age_ratings', key: 'id' } },
    weight: { type: DataTypes.FLOAT, allowNull: true },
    length: { type: DataTypes.FLOAT, allowNull: true },
    width: { type: DataTypes.FLOAT, allowNull: true },
    height: { type: DataTypes.FLOAT, allowNull: true },
    printFormatId: { type: DataTypes.INTEGER, allowNull: true, references: { model: 'print_formats', key: 'id' } },
  }, {
    sequelize,
    modelName: 'Book',
    tableName: 'books',
    timestamps: true,
    underscored: true
  });

  return Book;
};