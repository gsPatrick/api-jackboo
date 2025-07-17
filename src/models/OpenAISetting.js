// src/models/OpenAISetting.js
const { Model, DataTypes } = require('sequelize');

class OpenAISetting extends Model {
  static init(sequelize) {
    super.init({
      type: {
        type: DataTypes.ENUM('character_drawing', 'coloring_book_page', 'story_page_illustration', 'story_page_text'),
        allowNull: false,
        unique: true
      },
      basePromptText: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      // O campo baseImageDescriptions foi REMOVIDO. A informação virá da associação.
      model: {
        type: DataTypes.STRING,
        defaultValue: 'dall-e-3'
      },
      size: {
        type: DataTypes.STRING,
        defaultValue: '1024x1024'
      },
      quality: {
        type: DataTypes.ENUM('standard', 'hd'),
        defaultValue: 'standard'
      },
      style: {
        type: DataTypes.ENUM('vivid', 'natural'),
        defaultValue: 'vivid'
      },
      maxImageDescriptions: { // Este campo ainda pode ser útil para limitar no frontend
        type: DataTypes.INTEGER,
        defaultValue: 5
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      }
    }, {
      sequelize,
      tableName: 'openai_settings',
      timestamps: true,
      underscored: true,
    });
  }

  static associate(models) {
    // Relação muitos-para-muitos com AdminAsset
    this.belongsToMany(models.AdminAsset, {
      through: 'OpenAISettingAsset', // Usando a tabela pivô
      foreignKey: 'openAISettingId',
      otherKey: 'adminAssetId',
      as: 'baseAssets' // Nome do relacionamento para usar nos includes
    });
    // Associação com PageTemplate (já deve existir)
    this.hasMany(models.PageTemplate, { foreignKey: 'openAISettingId', as: 'pageTemplates' });
  }
}

module.exports = OpenAISetting;