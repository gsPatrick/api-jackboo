const { Model, DataTypes } = require('sequelize');

class ProductStock extends Model {
  static init(sequelize) {
    super.init({
      // O ID é gerado automaticamente
      variationId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'book_variations', // Nome da tabela de BookVariation
          key: 'id',
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        unique: true, // Uma variação de livro tem apenas uma entrada de estoque
      },
      available: { // Estoque disponível para venda
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      reserved: { // Estoque reservado para pedidos em processamento de pagamento
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
    }, {
      sequelize,
      tableName: 'product_stocks',
      timestamps: true,
      underscored: true,
    });
  }

  static associate(models) {
    this.belongsTo(models.BookVariation, {
      foreignKey: 'variationId',
      as: 'variation',
    });
  }
}

module.exports = ProductStock;