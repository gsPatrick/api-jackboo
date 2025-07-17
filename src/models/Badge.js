// src/models/Badge.js (Conteúdo completo como fornecido anteriormente)
const { Model, DataTypes } = require('sequelize');

class Badge extends Model {
  static init(sequelize) {
    super.init({
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: 'Nome do selo, ex: "Campeão Agosto 2024", "Finalista Oficial".'
      },
      type: {
        type: DataTypes.ENUM('winner', 'finalist', 'participant', 'special_event'),
        allowNull: false,
        comment: 'Tipo de selo: vencedor, finalista, participante, evento especial.'
      },
      imageUrl: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'URL da imagem do selo.'
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Uma breve descrição do que o selo significa.'
      },
      championshipId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'championships', key: 'id' },
        comment: 'ID do campeonato ao qual este selo está associado (se aplicável).'
      }
    }, {
      sequelize,
      tableName: 'badges',
      timestamps: true,
      underscored: true
    });
  }

  static associate(models) {
    this.belongsTo(models.Championship, { foreignKey: 'championshipId', as: 'championship' });
    this.hasMany(models.UserBadge, { foreignKey: 'badgeId', as: 'userBadges' });
    this.belongsToMany(models.User, { through: models.UserBadge, foreignKey: 'badgeId', as: 'users' });
  }
}

module.exports = Badge;