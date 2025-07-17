const { Model, DataTypes } = require('sequelize');

class AgeRating extends Model {
  static init(sequelize) {
    super.init({
      range: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: 'Ex: "3-5 anos", "6-8 anos", "Livre"'
      },
      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      order: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'Para ordenação no frontend (ex: 1, 2, 3).'
      }
    }, {
      sequelize,
      tableName: 'age_ratings',
    });
  }

  static associate(models) {
    this.hasMany(models.Book, { foreignKey: 'ageRatingId', as: 'books' });
  }
}

module.exports = AgeRating;