const { Model, DataTypes } = require('sequelize');

class GeneratedImageLog extends Model {
  static init(sequelize) {
    super.init({
      type: {
        type: DataTypes.ENUM('character_image', 'coloring_book_page', 'story_book_illustration'),
        allowNull: false,
        comment: 'Tipo de imagem gerada.'
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: true, // Pode ser gerado por um admin ou por um usuário do sistema (JackBoo)
        references: { model: 'users', key: 'id' },
      },
      associatedEntityId: {
        type: DataTypes.INTEGER,
        allowNull: true, // ID do Character ou Book associado
      },
      associatedEntityType: {
        type: DataTypes.STRING,
        allowNull: true, // 'Character' ou 'Book'
      },
      inputPrompt: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'O prompt completo enviado para a OpenAI.'
      },
      generatedImageUrl: {
        type: DataTypes.STRING,
        allowNull: true, // Nulo se a geração falhar
        comment: 'URL da imagem gerada e salva localmente.'
      },
      status: {
        type: DataTypes.ENUM('pending', 'success', 'failed'),
        defaultValue: 'pending',
        allowNull: false,
      },
      errorDetails: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Detalhes do erro se a geração falhar.'
      },
      cost: {
        type: DataTypes.DECIMAL(10, 4), // Valor monetário com mais precisão para custos
        allowNull: true,
        comment: 'Custo estimado da geração da imagem (se a API retornar ou for calculável).'
      }
    }, {
      sequelize,
      tableName: 'generated_image_logs',
      timestamps: true,
      underscored: true,
    });
  }

  static associate(models) {
    this.belongsTo(models.User, { foreignKey: 'userId', as: 'generatorUser' });
    // Não há associações diretas para associatedEntityId/Type no Sequelize,
    // será um relacionamento polimórfico tratado via lógica do serviço.
  }
}

module.exports = GeneratedImageLog;
