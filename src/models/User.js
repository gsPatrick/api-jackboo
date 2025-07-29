'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
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
      this.hasMany(models.AdminAsset, { foreignKey: 'uploadedByUserId', as: 'uploadedAssets' });
    }
  }

  User.init({
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
      validate: { isEmail: true },
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
      defaultValue: '/images/default-avatar.png', // Definir um valor padrão aqui
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
    },
    phone: {
        type: DataTypes.STRING,
        allowNull: true, // Permitir nulo para campos não obrigatórios no cadastro inicial
    },
    slug: { // NOVO CAMPO: SLUG
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    bio: { // NOVO CAMPO: BIO
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    underscored: true,
  });

  return User;
};