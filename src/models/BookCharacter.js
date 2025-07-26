// src/models/BookCharacter.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BookCharacter extends Model {
    static associate(models) {
      // Esta é uma tabela de junção, as associações
      // são definidas nos modelos Book e Character.
    }
  }

  BookCharacter.init({
    bookId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'books',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    characterId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'characters',
        key: 'id'
      },
      onDelete: 'CASCADE'
    }
  }, {
    sequelize,
    modelName: 'BookCharacter',
    tableName: 'book_characters',
    timestamps: false, // Tabela de junção não precisa de timestamps
    underscored: true,
  });

  return BookCharacter;
};