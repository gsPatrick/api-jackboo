
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path'); // Importe o 'path'
const mainRouter = require('./Routes/index');

const app = express();

// --- CONFIGURAÇÃO DE MIDDLEWARES (A ORDEM É TUDO) ---

// 1. Permite requisições de outras origens (seu frontend)
app.use(cors());

// 2. Ensina o Express a ler o corpo de requisições JSON (essencial para a maioria das rotas)
// DEVE VIR ANTES de `app.use('/api', mainRouter)`.
app.use(express.json());

// 3. Ensina o Express a ler corpos de requisição URL-encoded (útil para formulários HTML tradicionais)
app.use(express.urlencoded({ extended: true }));

// 4. Servir arquivos estáticos.
// Isso permite que o frontend acesse as imagens salvas através de URLs.
// Ex: https://geral-jackboo.r954jc.easypanel.host/uploads/user-drawings/arquivo.png
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/images', express.static(path.join(__dirname, '..', 'public', 'images')));

// --- FIM DA CONFIGURAÇÃO DE MIDDLEWARES ---

// 5. REGISTRO DAS ROTAS PRINCIPAIS
// Só depois que os middlewares acima estiverem configurados, o Express
// direciona as requisições para o nosso roteador principal.
app.use('/api', mainRouter);

// Middleware para tratamento de erros (opcional, mas bom ter)
app.use((err, req, res, next) => {
  console.error('--- ERRO INESPERADO ---');
  console.error(err.stack);
  console.error('-----------------------');
  res.status(500).send('Algo deu muito errado!');
});

module.exports = app;