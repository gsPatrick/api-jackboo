'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Badge extends Model {
    static associate(models) {
      this.belongsTo(models.Championship, { foreignKey: 'championshipId', as: 'championship' });
      this.hasMany(models.UserBadge, { foreignKey: 'badgeId', as: 'userBadges' });
      this.belongsToMany(models.User, { through: models.UserBadge, foreignKey: 'badgeId', otherKey: 'userId', as: 'users' });
    }
  }

  Badge.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    type: {
      type: DataTypes.ENUM('winner', 'finalist', 'participant', 'special_event'),
      allowNull: false,
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    championshipId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'championships', key: 'id' },
    }
  }, {
    sequelize,
    modelName: 'Badge',
    tableName: 'badges',
    timestamps: true,
    underscored: true,
  });

  return Badge;
};