// src/models/AdminAsset.js
const { Model, DataTypes } = require('sequelize');
const { deleteFile } = require('../Utils/fileHelper');

class AdminAsset extends Model {
  static init(sequelize) {
    super.init({
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Nome amigável do asset (ex: "Ilustração Estilo JackBoo 1").'
      },
      url: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        comment: 'URL relativa do asset no servidor (ex: "/uploads/admin-assets/ilustracao.png").'
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Descrição textual do asset para uso em prompts de IA. Essencial para guiar o estilo.'
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
      tableName: 'admin_assets',
      timestamps: true,
      underscored: true,
    });
  }

  static associate(models) {
    this.belongsTo(models.User, { foreignKey: 'uploadedByUserId', as: 'uploadedBy' });
    // Associação para a relação muitos-para-muitos com OpenAISetting
    this.belongsToMany(models.OpenAISetting, { 
      through: 'OpenAISettingAsset', 
      foreignKey: 'adminAssetId', 
      as: 'openAISettings' 
    });
  }
  
  static addHooks(models) {
    this.afterDestroy(async (asset, options) => {
      await deleteFile(asset.url);
    });
  }
}

module.exports = AdminAsset;