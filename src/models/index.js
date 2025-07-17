// src/database/index.js
const { Sequelize } = require('sequelize');
const dbConfig = require('../../config/config.json');
const fs = require('fs');
const path = require('path');

class Database {
  constructor() {
    this.connection = new Sequelize(dbConfig.development);
    this.models = {};
  }

  initModels() {
    const modelsPath = path.resolve(__dirname, '../../models');

    fs.readdirSync(modelsPath)
      .filter(file => file.endsWith('.js') && file !== 'index.js' && !file.endsWith('.map')) // Adicionado filtro para .map
      .forEach(file => {
        const modelDefinition = require(path.join(modelsPath, file));
        const model = modelDefinition.init(this.connection);
        this.models[model.name] = model;
      });

    Object.values(this.models)
      .filter(model => typeof model.associate === 'function')
      .forEach(model => model.associate(this.models));
    
    console.log('🐘 Models carregados e associados.');
  }

  // NOVO MÉTODO PARA CONTROLAR A INICIALIZAÇÃO
  async connect() {
    try {
      // 1. Testa a conexão
      await this.connection.authenticate();
      console.log('🔗 Conexão com o banco de dados estabelecida com sucesso.');

      // 2. Inicializa os models
      this.initModels();

      // 3. Sincroniza o banco de dados
      // alter: true é ótimo para desenvolvimento, mas use migrations para produção.
      await this.connection.sync({ alter: true });
      console.log('✅ Banco de dados sincronizado com sucesso.');

    } catch (error) {
      console.error('❌ Falha ao conectar ou sincronizar o banco de dados:', error);
      // Lança o erro para impedir que o servidor inicie
      throw error;
    }
  }
}

// Exporta uma única instância da classe
module.exports = new Database();