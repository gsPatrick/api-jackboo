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
      contentJson: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Armazena o conteúdo específico desta variação. Ex: os 10 capítulos da história ou as URLs das imagens para colorir.'
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
    // Uma variação de livro pode estar em múltiplos itens de pedido
    this.hasMany(models.OrderItem, { foreignKey: 'bookVariationId', as: 'orderItems' });
  }
}

module.exports = BookVariation;