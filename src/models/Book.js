// src/models/Book.js
const { Model, DataTypes } = require('sequelize');

class Book extends Model {
  static init(sequelize) {
    super.init({
      title: { 
        type: DataTypes.STRING, 
        allowNull: false 
      },
      seriesParentId: { 
        type: DataTypes.INTEGER, 
        allowNull: true, 
        references: { model: 'books', key: 'id' } 
      },
      genre: { 
        type: DataTypes.STRING, // Mudado para STRING para aceitar qualquer tema
        allowNull: true 
      },
      storyPrompt: { 
        type: DataTypes.JSONB, 
        allowNull: true,
        comment: 'Armazena os inputs que guiaram a geração (tema, lugar, resumo).'
      },
      status: { 
        type: DataTypes.ENUM('privado', 'publicado', 'pendente', 'gerando', 'falha_geracao'), 
        defaultValue: 'gerando', 
        allowNull: false 
      },
      finalPdfUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL relativa do arquivo PDF finalizado.'
      },
      categoryId: { 
        type: DataTypes.INTEGER, 
        allowNull: true, 
        references: { model: 'categories', key: 'id' } 
      },
      ageRatingId: { 
        type: DataTypes.INTEGER, 
        allowNull: true, 
        references: { model: 'age_ratings', key: 'id' } 
      },
      weight: { 
        type: DataTypes.FLOAT, 
        allowNull: true, // Permitir nulo inicialmente
        comment: 'Peso em kg' 
      },
      length: { 
        type: DataTypes.FLOAT, 
        allowNull: true, 
        comment: 'Em cm' 
      },
      width: { 
        type: DataTypes.FLOAT, 
        allowNull: true, 
        comment: 'Em cm' 
      },
      height: { 
        type: DataTypes.FLOAT, 
        allowNull: true, 
        comment: 'Em cm' 
      },
      printFormatId: { 
        type: DataTypes.INTEGER, 
        allowNull: true, 
        references: { model: 'print_formats', key: 'id' } 
      },
      // bookTemplateId foi REMOVIDO
    }, {
      sequelize,
      tableName: 'books',
      timestamps: true,
      underscored: true
    });
  }

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
  }
}

module.exports = Book;