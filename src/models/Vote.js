const { Model, DataTypes } = require('sequelize');

class Vote extends Model {
  static init(sequelize) {
    super.init({
      voterIp: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    }, {
      sequelize,
      tableName: 'votes',
      // Índice único para impedir múltiplos votos do mesmo usuário/IP na mesma submissão
      indexes: [
        {
          unique: true,
          fields: ['submissionId', 'userId']
        },
        {
          unique: true,
          fields: ['submissionId', 'voterIp']
        }
      ]
    });
  }

  static associate(models) {
    this.belongsTo(models.Submission, { foreignKey: 'submissionId', as: 'submission' });
    this.belongsTo(models.User, { foreignKey: 'userId', as: 'user', allowNull: true }); // Voto pode ser anônimo (IP)
  }
}

module.exports = Vote;