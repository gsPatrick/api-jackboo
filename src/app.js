require('dotenv').config(); // Usar require para dotenv
const express = require('express');
const mainRouter = require('./Routes/index'); // Importa o roteador principal

const app = express();

app.use(express.json());

// Serve arquivos estáticos da pasta 'uploads' (para desenhos, capas, etc.)
app.use('/uploads', express.static('uploads'));
// Serve arquivos estáticos da pasta 'public' (para imagens de selos, etc.)
app.use('/images', express.static('public/images'));

app.use('/api', mainRouter);

module.exports = app;