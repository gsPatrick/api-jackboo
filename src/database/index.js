const { Sequelize } = require('sequelize');
const dbConfig = require('../../config/config.json');
const fs = require('fs');
const path = require('path');

class Database {
  constructor() {
    this.connection = new Sequelize(dbConfig.development);
    this.models = {};
    this.initModels();
  }

  initModels() {
    const modelsPath = path.resolve(__dirname, '../../../models');

    fs.readdirSync(modelsPath)
      .filter(file => file.endsWith('.js') && file !== 'index.js')
      .forEach(file => {
        const model = require(path.join(modelsPath, file));
        const initializedModel = model.init(this.connection);
        this.models[initializedModel.name] = initializedModel;
      });

    Object.values(this.models)
      .filter(model => typeof model.associate === 'function')
      .forEach(model => model.associate(this.models));

    console.log('🐘 Models carregados automaticamente.');
  }
}

module.exports = new Database().connection;
