// src/models/BookVariation.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BookVariation extends Model {
    static associate(models) {
      // Associações existentes
      this.belongsTo(models.Book, { foreignKey: 'bookId', as: 'book' });
      this.hasMany(models.OrderItem, { foreignKey: 'bookVariationId', as: 'orderItems' });
      
      // --- ADIÇÃO CRÍTICA AQUI ---
      // Uma variação de livro tem muitas páginas de conteúdo.
      // 'as: pages' permite que você use include: [{ model: BookContentPage, as: 'pages' }]
      // 'onDelete: CASCADE' garante que ao deletar uma variação, suas páginas também sejam deletadas.
      this.hasMany(models.BookContentPage, { 
        foreignKey: 'bookVariationId', 
        as: 'pages', 
        onDelete: 'CASCADE' 
      });
      // --- FIM DA ADIÇÃO ---
    }
  }

  BookVariation.init({
    bookId: { // Boa prática definir a chave estrangeira explicitamente
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'books', // Nome da tabela
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    type: {
      type: DataTypes.ENUM('historia', 'colorir'),
      allowNull: false,
    },
    format: {
      type: DataTypes.ENUM('physical', 'digital_pdf'),
      allowNull: false,
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    coverUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    pageCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    bgColor: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    isAvailable: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
    },
    contentJson: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'BookVariation',
    tableName: 'book_variations',
    timestamps: true, // Recomendo manter timestamps para rastreabilidade
    underscored: true,
  });

  return BookVariation;
};