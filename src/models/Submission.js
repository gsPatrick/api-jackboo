'use strict';
const { Model } = require('sequelize');
const { deleteFile } = require('../Utils/fileHelper'); 

module.exports = (sequelize, DataTypes) => {
  class Submission extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'userId', as: 'submitter' });
      this.belongsTo(models.Championship, { foreignKey: 'championshipId', as: 'championship' });
      this.hasMany(models.Vote, { foreignKey: 'submissionId', as: 'votes' });
      this.hasMany(models.UserBadge, { foreignKey: 'submissionId', as: 'userBadges' });
    }

    static addHooks() {
      this.afterDestroy(async (submission, options) => {
        console.log(`[Hook] Deletando arquivo para a submissão ${submission.id}`);
        if (submission.drawingUrl) {
          await deleteFile(submission.drawingUrl);
        }
      });
    }
  }

  Submission.init({
    childName: { type: DataTypes.STRING, allowNull: false },
    childAge: { type: DataTypes.INTEGER, allowNull: false },
    ageGroup: { type: DataTypes.ENUM('3-5', '6-8', '9-11', '12+'), allowNull: false },
    drawingUrl: { type: DataTypes.STRING, allowNull: false },
    pageIdentifier: { type: DataTypes.STRING, allowNull: true },
    status: { type: DataTypes.ENUM('pending_approval', 'approved', 'rejected'), defaultValue: 'pending_approval', allowNull: false },
    finalScore: { type: DataTypes.INTEGER, allowNull: true },
    isWinner: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
    isFinalist: { type: DataTypes.BOOLEAN, defaultValue: false, allowNull: false },
  }, {
    sequelize,
    modelName: 'Submission',
    tableName: 'submissions',
    timestamps: true,
    underscored: true,
  });

  return Submission;
};