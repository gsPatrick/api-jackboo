// src/models/PrintFormat.js
const { Model, DataTypes } = require('sequelize');

class PrintFormat extends Model {
  static init(sequelize) {
    super.init({
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: 'Nome do formato (ex: "Original Boobie Goods", "Cards").'
      },
      // Medidas em centímetros (cm)
      coverWidth: { type: DataTypes.FLOAT, allowNull: false },
      coverHeight: { type: DataTypes.FLOAT, allowNull: false },
      pageWidth: { type: DataTypes.FLOAT, allowNull: false },
      pageHeight: { type: DataTypes.FLOAT, allowNull: false },
      margin: { type: DataTypes.FLOAT, allowNull: false, defaultValue: 1.5 },
      isActive: { type: DataTypes.BOOLEAN, defaultValue: true }
    }, {
      sequelize,
      tableName: 'print_formats',
      timestamps: true,
      underscored: true
    });
  }

  static associate(models) {
    // Um formato pode ser usado por muitos livros
    this.hasMany(models.Book, { foreignKey: 'printFormatId', as: 'books' });
  }
}

module.exports = PrintFormat;