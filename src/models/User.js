// src/models/User.js
'use strict';
const { Model } = require('sequelize');

// A principal mudança é que agora exportamos uma função que será chamada pelo index.js
module.exports = (sequelize, DataTypes) => {
  // A definição da classe continua a mesma
  class User extends Model {
    /**
     * O método de associação agora é um método estático da classe.
     * Ele receberá os outros modelos já inicializados no objeto 'models'.
     */
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

    /**
     * Se você usar hooks, eles também podem ser definidos aqui como um método estático
     * que é chamado pelo index.js. Isso mantém a lógica de deleção de arquivos
     * junto ao modelo.
     */
    static addHooks(models) {
      // Exemplo: Deletar avatar quando o usuário for deletado.
      // const { deleteFile } = require('../Utils/fileHelper');
      // this.afterDestroy(async (user, options) => {
      //   console.log(`[User Hook] Deletando avatar do usuário ${user.id}`);
      //   if (user.avatarUrl) {
      //     await deleteFile(user.avatarUrl);
      //   }
      // });
    }
  }

  // A chamada 'init' agora acontece dentro desta função.
  User.init({
    // A definição das colunas permanece exatamente a mesma.
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
    // O campo 'phone' não estava no seu modelo User.js original.
    // Se ele for uma coluna no banco, adicione-o aqui. Caso contrário, remova-o do `AuthService`.
    // Exemplo:
    // phone: {
    //   type: DataTypes.STRING,
    //   allowNull: true,
    // },
  }, {
    sequelize,
    modelName: 'User', // É uma boa prática definir o modelName explicitamente.
    tableName: 'users',
    timestamps: true,
    underscored: true,
  });

  // Finalmente, a função retorna a classe do modelo já inicializada.
  return User;
};