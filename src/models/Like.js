'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Like extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }

  Like.init({
    likableType: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    likableId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'Like',
    tableName: 'likes',
    indexes: [
      {
        unique: true,
        fields: ['userId', 'likableType', 'likableId']
      }
    ]
  });

  return Like;
};