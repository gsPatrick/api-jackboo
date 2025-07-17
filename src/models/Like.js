const { Model, DataTypes } = require('sequelize');

class Like extends Model {
  static init(sequelize) {
    super.init({
      // `likableType` armazena o nome do modelo (ex: 'Book', 'Character')
      likableType: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'O tipo da entidade que está sendo curtida (ex: "Book", "Character").'
      },
      // `likableId` armazena o ID da entidade curtida
      likableId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: 'O ID da entidade que está sendo curtida.'
      },
    }, {
      sequelize,
      tableName: 'likes',
      // Índice único para impedir múltiplos likes do mesmo usuário na mesma entidade
      indexes: [
        {
          unique: true,
          fields: ['userId', 'likableType', 'likableId']
        }
      ]
    });
  }

  static associate(models) {
    this.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });

    // Definindo associações polimórficas
    // Opcional: Adicionar belongsTo para Book e Character com `foreignKey: 'likableId'`
    // e `constraints: false` para permitir que o ID possa ser de qualquer um.
    // No entanto, é mais comum gerenciar isso na lógica do serviço/query.
    // Por exemplo, ao buscar likes, você incluiria os models manualmente.
  }
}

module.exports = Like;