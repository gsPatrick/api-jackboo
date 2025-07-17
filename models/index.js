// src/models/index.js

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process'); // Import process
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '../../config/config.json')[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

// Carrega todos os modelos da pasta principal (src/models)
fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file));
    // Importante: verificar se o model é uma classe do Sequelize antes de iniciar
    if (model.init) {
      db[model.name] = model.init(sequelize, Sequelize.DataTypes);
    }
  });

// Carrega modelos da pasta OpenAI/models, se existir
const openaiModelsDir = path.join(__dirname, '../OpenAI/models');
if (fs.existsSync(openaiModelsDir)) {
  fs
    .readdirSync(openaiModelsDir)
    .filter(file => {
      return (file.indexOf('.') !== 0) && (file.slice(-3) === '.js');
    })
    .forEach(file => {
      const model = require(path.join(openaiModelsDir, file));
      if (model.init) {
        db[model.name] = model.init(sequelize, Sequelize.DataTypes);
      }
    });
}


Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;