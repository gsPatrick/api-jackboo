// src/models/BookContentPage.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BookContentPage extends Model {
    static associate(models) {
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
    // --- CORREÇÃO: Adicionando campos para status e erro ---
    status: {
      type: DataTypes.ENUM('completed', 'failed'),
      defaultValue: 'completed',
      allowNull: false,
      comment: 'Status da geração desta página específica.'
    },
    errorDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Detalhes do erro, caso a geração da página falhe.'
    }
    // --- FIM DA CORREÇÃO ---
  }, {
    sequelize,
    modelName: 'BookContentPage',
    tableName: 'book_content_pages',
    timestamps: true,
    underscored: true,
  });

  return BookContentPage;
};