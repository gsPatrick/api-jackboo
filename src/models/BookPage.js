// src/models/BookPage.js
const { Model, DataTypes } = require('sequelize');

class BookPage extends Model {
  static init(sequelize) {
    super.init({
      pageNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'O número da página no livro final.'
      },
      pageType: {
        type: DataTypes.STRING,
        allowNull: true, 
        comment: 'Tipo funcional da página (ex: cover_front, story_illustration, coloring_page).'
      },
      generatedImageUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL da imagem gerada para esta página.'
      },
      status: {
        type: DataTypes.ENUM('pending', 'generating', 'completed', 'failed'),
        defaultValue: 'pending',
        allowNull: false
      },
      userInputJson: {
        type: DataTypes.JSONB,
        allowNull: true,
        comment: 'Armazena os inputs específicos do usuário/admin para esta página, se houver.'
      },
      errorDetails: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Detalhes do erro em caso de falha na geração.'
      },
      // REMOVIDO: O campo pageTemplateId não é mais necessário.
      // pageTemplateId: { ... }
    }, {
      sequelize,
      tableName: 'book_pages',
      timestamps: true,
      underscored: true,
    });
  }

  static associate(models) {
    this.belongsTo(models.Book, { foreignKey: 'bookId', as: 'book' });
    // REMOVIDO: A associação com PageTemplate foi removida.
  }
}

module.exports = BookPage;