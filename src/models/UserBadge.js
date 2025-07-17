'use strict';
const { Model, Op } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class UserBadge extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      this.belongsTo(models.Badge, { foreignKey: 'badgeId', as: 'badge' });
      this.belongsTo(models.Submission, { foreignKey: 'submissionId', as: 'submission' });
    }
  }

  UserBadge.init({
    awardDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    submissionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'submissions', key: 'id' },
    }
  }, {
    sequelize,
    modelName: 'UserBadge',
    tableName: 'user_badges',
    timestamps: false,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['userId', 'badgeId', 'submissionId'],
        where: { submissionId: { [Op.ne]: null } }
      },
      {
        unique: true,
        fields: ['userId', 'badgeId'],
        where: { submissionId: null }
      }
    ]
  });

  return UserBadge;
};