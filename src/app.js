// src/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mainRouter = require('./Routes/index');
const webhookRouter = require('./Features/Webhook/Webhook.routes'); // Corrigido o caminho

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- CORREÇÃO AQUI ---
// Esta configuração garante que o caminho para a pasta 'uploads' seja resolvido
// corretamente a partir da raiz do seu projeto.
const uploadsPath = path.resolve(process.cwd(), 'uploads');
console.log(`[Server] Servindo arquivos estáticos da pasta: ${uploadsPath}`);
app.use('/uploads', express.static(uploadsPath)); // << ISSO ESTÁ CORRETO
// --- FIM DA CORREÇÃO ---

// Mantém o 'images' se você tiver uma pasta public/images na raiz
app.use('/images', express.static(path.resolve(process.cwd(), 'public', 'images')));

app.use('/api', mainRouter);
app.use('/api/webhooks', webhookRouter);

app.use((err, req, res, next) => {
  console.error("--- ERRO GLOBAL CAPTURADO ---");
  console.error(err);
  // Garante que o status do erro seja usado, se disponível
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({ message: err.message || 'Ocorreu um erro inesperado no servidor.' });
});

module.exports = app;