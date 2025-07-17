require('dotenv').config();
const express = require('express');
const cors = require('cors'); // <-- 1. Importar o pacote CORS
const mainRouter = require('./Routes/index');

const app = express();

// --- CONFIGURAÇÃO DO CORS ---
// Habilita o CORS para todas as origens e rotas.
// Isso permite que seu frontend (ex: em localhost:3000)
// faça requisições para sua API (ex: em localhost:3333).
// É importante que esta linha venha ANTES das suas rotas.
app.use(cors()); // <-- 2. Usar o middleware para habilitar

// Middleware para interpretar o corpo das requisições como JSON
app.use(express.json());

// Serve arquivos estáticos da pasta 'uploads' (para desenhos, capas, etc.)
app.use('/uploads', express.static('uploads'));
// Serve arquivos estáticos da pasta 'public' (para imagens de selos, etc.)
app.use('/images', express.static('public/images'));

// Roteador principal da API
app.use('/api', mainRouter);

module.exports = app;