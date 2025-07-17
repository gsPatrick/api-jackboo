'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Vote extends Model {
    static associate(models) {
      this.belongsTo(models.Submission, { foreignKey: 'submissionId', as: 'submission' });
      this.belongsTo(models.User, { foreignKey: 'userId', as: 'user' }); // allowNull é true por padrão
    }
  }

  Vote.init({
    voterIp: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    // O userId vem da associação
  }, {
    sequelize,
    modelName: 'Vote',
    tableName: 'votes',
    indexes: [
      {
        unique: true,
        fields: ['submissionId', 'userId'],
        where: { userId: { [DataTypes.Op.ne]: null } } // Voto de usuário logado
      },
      {
        unique: true,
        fields: ['submissionId', 'voterIp'] // Voto por IP
      }
    ]
  });

  return Vote;
};