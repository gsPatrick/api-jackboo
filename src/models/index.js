'use strict';
const fs = require('fs');
const path = require('path'); // <<< Garanta que 'path' está importado
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';

// --- ESTA É A LINHA QUE PRECISA SER EXATAMENTE ASSIM ---
// O arquivo config.json está dois níveis acima da pasta 'models'
// Ex: /workspace/src/models/index.js -> /workspace/config/config.json
const config = require(path.join(__dirname, '../../config/config.json'))[env];
// --- FIM DA LINHA A SER CORRIGIDA ---
const db = {};

const sequelize = new Sequelize(config.database, config.username, config.password, config);

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
