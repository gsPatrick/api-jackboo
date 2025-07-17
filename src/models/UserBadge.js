// src/models/UserBadge.js (Conteúdo completo como fornecido anteriormente)
const { Model, DataTypes } = require('sequelize');

class UserBadge extends Model {
  static init(sequelize) {
    super.init({
      awardDate: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'Data em que o selo foi concedido ao usuário.'
      },
      comment: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Comentário opcional sobre a conquista, ex: "Pelo seu desenho de Jackzinho Aventureiro no Campeonato de Junho".'
      },
      submissionId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'submissions', key: 'id' },
        comment: 'ID da submissão que levou à concessão deste selo (se aplicável).'
      }
    }, {
      sequelize,
      tableName: 'user_badges',
      timestamps: false,
      underscored: true,
      indexes: [
        {
          unique: true,
          fields: ['userId', 'badgeId', 'submissionId'],
          where: { submissionId: { [DataTypes.Op.ne]: null } }
        },
        {
          unique: true,
          fields: ['userId', 'badgeId'],
          where: { submissionId: { [DataTypes.Op.eq]: null } }
        }
      ]
    });
  }

  static associate(models) {
    this.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    this.belongsTo(models.Badge, { foreignKey: 'badgeId', as: 'badge' });
    this.belongsTo(models.Submission, { foreignKey: 'submissionId', as: 'submission' });
  }
}

module.exports = UserBadge;