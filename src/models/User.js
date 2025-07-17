const { Model, DataTypes } = require('sequelize');

class User extends Model {
  static init(sequelize) {
    super.init({
      fullName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      nickname: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true,
        },
      },
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      birthDate: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      avatarUrl: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      role: {
        type: DataTypes.ENUM('user', 'subscriber', 'admin'),
        defaultValue: 'user',
        allowNull: false,
      },
      accountStatus: {
        type: DataTypes.ENUM('active', 'inactive', 'pending_verification'),
        defaultValue: 'pending_verification',
        allowNull: false,
      },
      lastIp: {
        type: DataTypes.STRING,
        allowNull: true,
      },
       isSystemUser: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Identifica se o usuário é uma conta do sistema (ex: JackBoo).'
      }
    }, {
      sequelize,
      tableName: 'users',
    });
  }

  static associate(models) {
    this.hasMany(models.Character, { foreignKey: 'userId', as: 'characters' });
    this.hasMany(models.Book, { foreignKey: 'authorId', as: 'authoredBooks' });
    this.hasOne(models.Subscription, { foreignKey: 'userId', as: 'subscription' });
    this.hasMany(models.Order, { foreignKey: 'userId', as: 'orders' });
    this.hasMany(models.Royalty, { foreignKey: 'authorId', as: 'royalties' });
    this.hasMany(models.Submission, { foreignKey: 'userId', as: 'submissions' });
    this.hasMany(models.Like, { foreignKey: 'userId', as: 'likes' });
    this.hasMany(models.Vote, { foreignKey: 'userId', as: 'votes' });
    this.hasMany(models.Address, { foreignKey: 'userId', as: 'addresses' });

    this.hasMany(models.UserBadge, { foreignKey: 'userId', as: 'userBadges' });
    this.belongsToMany(models.Badge, {
      through: models.UserBadge,
      foreignKey: 'userId',
      otherKey: 'badgeId',
      as: 'badges'
    });
    // --- NOVO: Relação com AdminAsset para rastrear quem carregou o asset ---
    this.hasMany(models.AdminAsset, { foreignKey: 'uploadedByUserId', as: 'uploadedAssets' });
    // ---------------------------------------------------------------------
  }
}

module.exports = User;
