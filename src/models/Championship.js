'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Championship extends Model {
    static associate(models) {
      this.hasMany(models.Submission, { foreignKey: 'championshipId', as: 'submissions' });
      this.hasMany(models.Badge, { foreignKey: 'championshipId', as: 'badges' });
    }
  }

  Championship.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('upcoming', 'open_for_submissions', 'voting', 'closed', 'finished'),
      defaultValue: 'upcoming',
      allowNull: false,
    },
    availablePrizes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    }
  }, {
    sequelize,
    modelName: 'Championship',
    tableName: 'championships',
    timestamps: false, // Este modelo não tinha timestamps
  });

  return Championship;
};