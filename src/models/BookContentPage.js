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
        references: { model: 'book_variations', key: 'id' },
        onDelete: 'CASCADE'
    },
    pageNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    pageType: {
      type: DataTypes.ENUM('text', 'illustration', 'coloring_page', 'cover'),
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    illustrationPrompt: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // --- CORREÇÃO: Adicionando 'generating' ao ENUM ---
    status: {
      type: DataTypes.ENUM('generating', 'completed', 'failed'),
      defaultValue: 'generating', // O padrão agora é 'generating'
      allowNull: false,
    },
    errorDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
    }
  }, {
    sequelize,
    modelName: 'BookContentPage',
    tableName: 'book_content_pages',
    timestamps: true,
    underscored: true,
  });

  return BookContentPage;
};