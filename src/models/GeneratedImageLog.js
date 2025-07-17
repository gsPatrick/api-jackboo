'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GeneratedImageLog extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'userId', as: 'generatorUser' });
    }
  }

  GeneratedImageLog.init({
    type: {
      type: DataTypes.STRING, // Alterado de ENUM para STRING para mais flexibilidade
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    associatedEntityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    associatedEntityType: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    inputPrompt: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    generatedImageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'success', 'failed'),
      defaultValue: 'pending',
      allowNull: false,
    },
    errorDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    cost: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: true,
    }
  }, {
    sequelize,
    modelName: 'GeneratedImageLog',
    tableName: 'generated_image_logs',
    timestamps: true,
    underscored: true,
  });

  return GeneratedImageLog;
};