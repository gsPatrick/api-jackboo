const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Define o diretório de uploads de forma robusta
const USER_DRAWINGS_DIR = path.resolve(__dirname, '..', '..', 'uploads', 'user-drawings');

// Garante que o diretório exista
fs.mkdirSync(USER_DRAWINGS_DIR, { recursive: true });

// Configuração de armazenamento (storage)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, USER_DRAWINGS_DIR);
  },
  filename: function (req, file, cb) {
    // Gera um nome de arquivo único para evitar conflitos
    const extension = path.extname(file.originalname) || '.png';
    const uniqueFilename = `${uuidv4()}${extension}`;
    cb(null, uniqueFilename);
  }
});

// Filtro de arquivo para aceitar apenas imagens
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/pjpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo de imagem inválido.'), false);
  }
};

// Exporta a instância do Multer configurada
const uploadUserDrawing = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 10 // 10MB
  },
  fileFilter: fileFilter
});

// Não precisamos exportar as outras configs de admin agora para simplificar o diagnóstico
module.exports = { uploadUserDrawing };