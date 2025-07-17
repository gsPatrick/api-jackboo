'use strict';
const { Model } = require('sequelize');
const { deleteFile } = require('../Utils/fileHelper');

module.exports = (sequelize, DataTypes) => {
  class AdminAsset extends Model {
    static associate(models) {
      this.belongsTo(models.User, { foreignKey: 'uploadedByUserId', as: 'uploadedBy' });
      this.belongsToMany(models.OpenAISetting, { 
        through: 'OpenAISettingAsset', 
        foreignKey: 'adminAssetId',
        otherKey: 'openAISettingId',
        as: 'openAISettings' 
      });
    }

    static addHooks() {
      this.afterDestroy(async (asset, options) => {
        await deleteFile(asset.url);
      });
    }
  }

  AdminAsset.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM('image', 'video', 'audio', 'document'),
      defaultValue: 'image',
      allowNull: false
    },
    uploadedByUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    }
  }, {
    sequelize,
    modelName: 'AdminAsset',
    tableName: 'admin_assets',
    timestamps: true,
    underscored: true,
  });

  return AdminAsset;
};