// src/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mainRouter = require('./Routes/index');

const app = express();


// --- INÍCIO DA CONFIGURAÇÃO DE MIDDLEWARES (A ORDEM AQUI É TUDO) ---

// 1. Permite que seu frontend em localhost:3000 (ou outro endereço)
//    faça requisições para seu backend em localhost:3333.
app.use(cors());

// 2. >>> ESTA É A LINHA MAIS IMPORTANTE PARA O SEU PROBLEMA <<<
//    Ensina o Express a ler o corpo de requisições que vêm no formato JSON
//    e a popular o objeto `req.body`.
//    DEVE VIR ANTES DE `app.use('/api', mainRouter)`.
app.use(express.json());

// 3. Middlewares para servir arquivos estáticos (imagens, uploads).
app.use('/uploads', express.static('uploads'));
app.use('/images', express.static('public/images'));

// --- FIM DA CONFIGURAÇÃO DE MIDDLEWARES ---


// 4. REGISTRO DAS ROTAS
//    Só depois que todos os middlewares acima estiverem configurados,
//    o Express deve direcionar as requisições para as rotas.
app.use('/api', mainRouter);


module.exports = app;