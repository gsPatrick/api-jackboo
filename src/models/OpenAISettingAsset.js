// src/models/OpenAISettingAsset.js
const { Model } = require('sequelize');

class OpenAISettingAsset extends Model {
  static init(sequelize) {
    super.init({}, {
      sequelize,
      tableName: 'openai_setting_assets',
      timestamps: false,
      underscored: true,
    });
  }
  
  static associate(models) {
    // Definir as associações aqui pode ajudar em queries mais complexas, mas o principal é definido no belongsToMany
  }
}

module.exports = OpenAISettingAsset;