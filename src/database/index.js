const { Sequelize } = require('sequelize');
const dbConfig = require('../../config/config.json');

// Importe todos os seus models aqui
const User = require('../models/User');
// ... outros models

const models = [User /*, ...outros models*/];

class Database {
  constructor() {
    this.init();
  }

  init() {
    // Seleciona a configuração 'development' do config.json
    this.connection = new Sequelize(dbConfig.development);

    // Inicializa cada model e depois associa
    models
      .map(model => model.init(this.connection))
      .map(model => model.associate && model.associate(this.connection.models));
    
    console.log('🐘 Models inicializados e associados.');
  }
}

// Exporta a conexão, que será usada no app.js
module.exports = new Database().connection;