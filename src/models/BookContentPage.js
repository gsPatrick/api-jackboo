const { Model, DataTypes } = require('sequelize');

class BookContentPage extends Model {
  static init(sequelize) {
    super.init({
      pageNumber: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Número da página no livro.'
      },
      pageType: {
        type: DataTypes.ENUM('text', 'illustration', 'coloring_page', 'cover'),
        allowNull: false,
        comment: 'Tipo de conteúdo da página (texto, ilustração, página de colorir, capa).'
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Conteúdo textual da página (se pageType for "text").'
      },
      imageUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'URL da imagem da página (se pageType for "illustration" ou "coloring_page").'
      },
      illustrationPrompt: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Prompt usado para gerar a ilustração desta página (se aplicável).'
      },
      // Pode adicionar outros metadados específicos da página, se necessário
    }, {
      sequelize,
      tableName: 'book_content_pages',
      timestamps: true,
      underscored: true,
    });
  }

  static associate(models) {
    // Uma página pertence a uma variação de livro (história ou colorir)
    this.belongsTo(models.BookVariation, { foreignKey: 'bookVariationId', as: 'bookVariation' });
  }
}

module.exports = BookContentPage;