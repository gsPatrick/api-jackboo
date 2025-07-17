const { Model, DataTypes } = require('sequelize');

class Address extends Model {
  static init(sequelize) {
    super.init({
      street: { type: DataTypes.STRING, allowNull: false },
      number: { type: DataTypes.STRING, allowNull: false },
      complement: { type: DataTypes.STRING, allowNull: true },
      neighborhood: { type: DataTypes.STRING, allowNull: false },
      city: { type: DataTypes.STRING, allowNull: false },
      state: { type: DataTypes.STRING, allowNull: false },
      zipCode: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'zip_code' // Mapeia para a coluna zip_code no DB
      },
      isPrimary: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        field: 'is_primary'
      }
    }, {
      sequelize,
      tableName: 'addresses',
      underscored: true // Usa snake_case para nomes de colunas no DB
    });
  }

  static associate(models) {
    this.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
  }
}

module.exports = Address;