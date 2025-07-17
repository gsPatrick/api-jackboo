'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AgeRating extends Model {
    static associate(models) {
      this.hasMany(models.Book, { foreignKey: 'ageRatingId', as: 'books' });
    }
  }

  AgeRating.init({
    range: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    }
  }, {
    sequelize,
    modelName: 'AgeRating',
    tableName: 'age_ratings',
    timestamps: false, // Este modelo não tinha timestamps
  });

  return AgeRating;
};