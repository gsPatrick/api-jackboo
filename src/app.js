
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const mainRouter = require('./Routes/index');

const app = express();

// 1. CORS: Libera o acesso para seu frontend. Essencial.
app.use(cors());

// 2. MIDDLEWARES DE PARSE DE CORPO:
// Estes middlewares leem o corpo da requisição. Se eles forem executados
// em uma requisição `multipart/form-data` antes do Multer, eles podem
// "consumir" o corpo, e o Multer não encontrará o arquivo.
// O Express é inteligente o suficiente para não fazer o parse de JSON em um
// FormData, mas vamos manter a ordem por segurança.
app.use(express.json()); // Para corpos JSON
app.use(express.urlencoded({ extended: true })); // Para formulários tradicionais

// 3. SERVIR ARQUIVOS ESTÁTICOS:
// Permite que o mundo externo acesse os arquivos nas pastas 'uploads' e 'public'.
// Ex: GET https://.../uploads/arquivo.png
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));
app.use('/images', express.static(path.join(__dirname, '..', 'public', 'images')));

// 4. ROTEADOR PRINCIPAL:
// A requisição chega aqui depois de passar pelos middlewares acima.
// O Express vai direcionar para a rota correspondente (ex: /api/content/characters),
// onde o middleware específico da rota (Multer) será finalmente executado.
app.use('/api', mainRouter);

// 5. TRATAMENTO DE ERRO (Opcional, mas recomendado)
app.use((err, req, res, next) => {
  console.error("--- ERRO GLOBAL CAPTURADO ---");
  console.error(err);
  res.status(500).json({ message: err.message || 'Ocorreu um erro inesperado no servidor.' });
});

module.exports = app;