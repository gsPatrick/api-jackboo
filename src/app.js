// src/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mainRouter = require('./Routes/index');

const app = express();

// A inicialização do banco de dados NÃO pertence a este arquivo.
// Ela é gerenciada pelo server.js.
// REMOVA a linha: const database = require('./src/database/index');

app.use(cors());
app.use(express.json());

// Servir arquivos estáticos
app.use('/uploads', express.static('uploads'));
app.use('/images', express.static('public/images'));

// Roteador principal da API
app.use('/api', mainRouter);

module.exports = app;