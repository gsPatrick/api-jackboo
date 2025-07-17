// src/models/Address.js
'use strict';
const { Model } = require('sequelize');

// A principal mudança: exportar uma função que recebe (sequelize, DataTypes)
module.exports = (sequelize, DataTypes) => {
  // A definição da classe vai aqui dentro
  class Address extends Model {
    static associate(models) {
      // A associação também vai aqui dentro
      this.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }

  // A chamada init() vai aqui dentro
  Address.init({
    // As definições de coluna permanecem as mesmas
    street: { type: DataTypes.STRING, allowNull: false },
    number: { type: DataTypes.STRING, allowNull: false },
    complement: { type: DataTypes.STRING, allowNull: true },
    neighborhood: { type: DataTypes.STRING, allowNull: false },
    city: { type: DataTypes.STRING, allowNull: false },
    state: { type: DataTypes.STRING, allowNull: false },
    zipCode: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'zip_code'
    },
    isPrimary: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_primary'
    }
  }, {
    sequelize,
    modelName: 'Address', // Boa prática definir o nome do modelo
    tableName: 'addresses',
    underscored: true,
  });

  // A função retorna a classe do modelo inicializada
  return Address;
};