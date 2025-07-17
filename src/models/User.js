const { Model, DataTypes } = require('sequelize');
// Importar o hook de deleção de arquivo se você o tiver para usuários
// const { deleteFile } = require('../Utils/fileHelper'); 

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
      passwordHash: { // Campo renomeado para ser mais descritivo
        type: DataTypes.STRING,
        allowNull: false,
      },
      birthDate: {
        type: DataTypes.STRING, // Mudado de DATEONLY para STRING para testar compatibilidade.
                                // Validações de formato devem ser feitas no controller/service.
        allowNull: false,
      },
      avatarUrl: {
        type: DataTypes.STRING,
        allowNull: true, // Permite que o avatar seja opcional no início
      },
      role: {
        type: DataTypes.ENUM('user', 'subscriber', 'admin'), // Adicionado 'subscriber'
        defaultValue: 'user',
        allowNull: false,
      },
      accountStatus: {
        type: DataTypes.ENUM('active', 'inactive', 'pending_verification'), // Adicionado 'pending_verification'
        defaultValue: 'pending_verification',
        allowNull: false,
      },
      lastIp: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      isSystemUser: { // Campo para identificar usuários internos (ex: JackBoo)
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Identifica se o usuário é uma conta do sistema (ex: JackBoo).'
      }
    }, {
      sequelize,
      tableName: 'users',
      timestamps: true, // Cria createdAt e updatedAt
      underscored: true, // Usa snake_case para os nomes das colunas no banco de dados
      // hooks: {
      //   beforeCreate: async (user) => { // Exemplo de hook, mas NÃO recomendado colocar lógica de negócio aqui diretamente
      //     // Poderia haver validações ou hashing, mas a lógica principal está no AuthService
      //   },
      //   beforeDestroy: async (user, options) => { // Hook para deletar arquivos associados, se houver
      //     // if (user.avatarUrl) {
      //     //   await deleteFile(user.avatarUrl);
      //     // }
      //   }
      // }
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
    // Relação com AdminAsset para rastrear quem carregou o asset
    this.hasMany(models.AdminAsset, { foreignKey: 'uploadedByUserId', as: 'uploadedAssets' });
  }
  
  // Exemplo de hook adicionado em outro local (não dentro do init) se você precisar de lógica após a destruição.
  // static addHooks(models) {
  //   this.afterDestroy(async (user, options) => {
  //     console.log(`[User Hook] Deletando arquivos associados ao usuário ${user.id}`);
  //     if (user.avatarUrl) {
  //       await deleteFile(user.avatarUrl); // Certifique-se que deleteFile está implementado
  //     }
  //   });
  // }
}

module.exports = User;