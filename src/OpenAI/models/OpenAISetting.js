const { Model, DataTypes } = require('sequelize');

class OpenAISetting extends Model {
  static init(sequelize) {
    super.init({
      type: {
        type: DataTypes.ENUM('character_drawing', 'coloring_book_page', 'story_book_illustration'),
        allowNull: false,
        unique: true,
        comment: 'Tipo de geração de imagem, ex: desenho de personagem, página de colorir, ilustração de livro de história.'
      },
      basePromptText: {
        type: DataTypes.TEXT,
        allowNull: false,
        comment: 'Parte principal do prompt de texto que será enviada à OpenAI.'
      },
      baseImageDescriptions: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
        comment: 'Array de strings com descrições textuais das imagens base que serão incorporadas ao prompt. Ex: ["um cavalo marrom com crina longa", "estilo aquarela"].'
      },
      model: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'dall-e-3',
        comment: 'Modelo DALL-E a ser usado (ex: "dall-e-2", "dall-e-3").'
      },
      size: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '1024x1024',
        comment: 'Tamanho da imagem gerada (ex: "1024x1024", "1792x1024").'
      },
      quality: { // Apenas para DALL-E 3
        type: DataTypes.ENUM('standard', 'hd'),
        allowNull: false,
        defaultValue: 'standard',
        comment: 'Qualidade da imagem para DALL-E 3 ("standard" ou "hd").'
      },
      style: { // Apenas para DALL-E 3
        type: DataTypes.ENUM('vivid', 'natural'),
        allowNull: false,
        defaultValue: 'vivid',
        comment: 'Estilo visual para DALL-E 3 ("vivid" ou "natural").'
      },
      maxImageDescriptions: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5,
        comment: 'Número máximo de descrições de imagens base que o admin pode adicionar.'
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Indica se esta configuração de prompt está ativa e pode ser usada.'
      }
    }, {
      sequelize,
      tableName: 'openai_settings',
      timestamps: true,
      underscored: true,
    });
  }

  // Não há associações diretas para este modelo, ele é uma tabela de configuração.
}

module.exports = OpenAISetting;
