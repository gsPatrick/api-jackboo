'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class OpenAISettingAsset extends Model {
    static associate(models) {
      // Associações definidas no belongsToMany
    }
  }

  OpenAISettingAsset.init({}, {
    sequelize,
    modelName: 'OpenAISettingAsset',
    tableName: 'openai_setting_assets',
    timestamps: false,
    underscored: true,
  });

  return OpenAISettingAsset;
};