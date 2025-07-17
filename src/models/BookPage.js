'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BookPage extends Model {
    static associate(models) {
      this.belongsTo(models.Book, { foreignKey: 'bookId', as: 'book' });
    }
  }

  BookPage.init({
    pageNumber: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    pageType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    generatedImageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'generating', 'completed', 'failed'),
      defaultValue: 'pending',
      allowNull: false
    },
    userInputJson: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    errorDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
    }
  }, {
    sequelize,
    modelName: 'BookPage',
    tableName: 'book_pages',
    timestamps: true,
    underscored: true,
  });

  return BookPage;
};