// src/models/Submission.js
const { Model, DataTypes } = require('sequelize');
const { deleteFile } = require('../Utils/fileHelper'); 

class Submission extends Model {
  static init(sequelize) {
    super.init({
      childName: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Nome da criança que fez o desenho.'
      },
      childAge: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'Idade da criança no momento da submissão.'
      },
      ageGroup: {
        type: DataTypes.ENUM('3-5', '6-8', '9-11', '12+'),
        allowNull: false,
        comment: 'Faixa etária da criança.'
      },
      drawingUrl: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'URL do desenho submetido.'
      },
      pageIdentifier: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Identificador único da página JackBoo usada para o desenho (ex: QR Code, código de série).'
      },
      status: {
        type: DataTypes.ENUM('pending_approval', 'approved', 'rejected'),
        defaultValue: 'pending_approval',
        allowNull: false,
        comment: 'Status da submissão: aguardando aprovação, aprovada ou rejeitada.'
      },
      finalScore: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Pontuação final da submissão para classificação no campeonato.'
      },
      isWinner: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Indica se a submissão foi um dos vencedores do campeonato.'
      },
      isFinalist: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Indica se a submissão foi um dos finalistas do campeonato.'
      },
    }, {
      sequelize,
      tableName: 'submissions',
      timestamps: true,
      underscored: true,
    });
  }

  static associate(models) {
    this.belongsTo(models.User, { foreignKey: 'userId', as: 'submitter' });
    this.belongsTo(models.Championship, { foreignKey: 'championshipId', as: 'championship' });
    this.hasMany(models.Vote, { foreignKey: 'submissionId', as: 'votes' });
    this.hasMany(models.UserBadge, { foreignKey: 'submissionId', as: 'userBadges' });
  }

  static addHooks(models) {
    this.afterDestroy(async (submission, options) => {
      console.log(`[Hook] Deletando arquivo para a submissão ${submission.id}`);
      if (submission.drawingUrl) {
        await deleteFile(submission.drawingUrl);
      }
    });
  }
}

// CORREÇÃO APLICADA AQUI:
module.exports = Submission; 