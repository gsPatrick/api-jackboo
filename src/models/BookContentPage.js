// src/models/BookContentPage.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BookContentPage extends Model {
    static associate(models) {
      // Uma página de conteúdo pertence a uma variação de livro.
      // 'as: bookVariation' permite o acesso reverso (se necessário).
      this.belongsTo(models.BookVariation, { 
        foreignKey: 'bookVariationId', 
        as: 'bookVariation' 
      });
    }
  }

  BookContentPage.init({
    bookVariationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'book_variations', // Nome da tabela
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    pageNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'Número da página no livro.'
    },
    pageType: {
      type: DataTypes.ENUM('text', 'illustration', 'coloring_page', 'cover'),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Conteúdo textual da página (se pageType for "text").'
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'URL da imagem da página.'
    },
    illustrationPrompt: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Prompt usado para gerar a ilustração.'
    },
  }, {
    sequelize,
    modelName: 'BookContentPage',
    tableName: 'book_content_pages',
    timestamps: true,
    underscored: true,
  });

  return BookContentPage;
};