const { Model, DataTypes } = require('sequelize');

class Championship extends Model {
  static init(sequelize) {
    super.init({
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Ex: Campeonato de Desenho - Agosto/2024'
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
      tableName: 'championships',
    });
  }

  static associate(models) {
    this.hasMany(models.Submission, { foreignKey: 'championshipId', as: 'submissions' });
    // Um campeonato pode gerar vários tipos de selos (vencedor, finalista, etc.)
    this.hasMany(models.Badge, { foreignKey: 'championshipId', as: 'badges' });
  }
}

module.exports = Championship;
