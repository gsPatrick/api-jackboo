// src/models/BookVariation.js
const { Model, DataTypes } = require('sequelize');

class BookVariation extends Model {
  static init(sequelize) {
    super.init({
      type: {
        type: DataTypes.ENUM('historia', 'colorir'),
        allowNull: false,
        comment: 'Define se esta variação é um livro de história ou de colorir.'
      },
      format: {
        type: DataTypes.ENUM('physical', 'digital_pdf'),
        allowNull: false,
        comment: 'Define o formato da entrega: físico ou PDF digital.'
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Pequena descrição da variação. Ex: Capa dura, 24 páginas.'
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
        comment: 'Cor de fundo para exibição no frontend.'
      },
      isAvailable: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Permite desativar uma variação específica sem apagar o livro.'
      },
      // CORREÇÃO APLICADA AQUI: O campo 'contentJson' duplicado foi removido.
      // Esta é a versão correta que foi mantida.
      contentJson: {
        type: DataTypes.JSONB,
        allowNull: true,
        // AGORA ARMAZENA O RESULTADO FINAL. Ex: { "pdfUrl": "/uploads/books/final-book.pdf" }
        comment: 'Armazena o conteúdo finalizado, como a URL do PDF gerado.'
      },
    }, {
      sequelize,
      tableName: 'book_variations',
    });
  }

  static associate(models) {
    this.belongsTo(models.Book, { foreignKey: 'bookId', as: 'book' });
    this.hasMany(models.OrderItem, { foreignKey: 'bookVariationId', as: 'orderItems' });
  }
}

module.exports = BookVariation;