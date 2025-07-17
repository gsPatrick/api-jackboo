const { Model, DataTypes } = require('sequelize');

class Setting extends Model {
  static init(sequelize) {
    super.init({
      key: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        primaryKey: true,
        comment: 'A chave única da configuração (ex: free_character_limit, royalty_percentage, character_generation_extra_prompt).'
      },
      value: {
        type: DataTypes.STRING, // Ou TEXT se o prompt for muito longo
        allowNull: false,
        comment: 'O valor da configuração (será parseado conforme necessário).'
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descrição do que a configuração faz.'
      }
    }, {
      sequelize,
      tableName: 'settings',
      timestamps: true,
    });
  }
}

module.exports = Setting;
