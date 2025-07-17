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
      field: 'award_date',
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    submissionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'submissions', key: 'id' },
      field: 'submission_id',
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
        fields: ['user_id', 'badge_id', 'submission_id'],
        where: { submission_id: { [Op.ne]: null } }
      },
      {
        unique: true,
        fields: ['user_id', 'badge_id'],
        where: { submission_id: null }
      }
    ]
  });

  return UserBadge;
};
