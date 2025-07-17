const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid'); // Garante nomes únicos

// Define os diretórios de destino dentro da pasta raiz 'uploads'
const UPLOADS_ROOT_DIR = path.join(__dirname, '..', '..', 'uploads');
const USER_DRAWINGS_DIR = path.join(UPLOADS_ROOT_DIR, 'user-drawings');
const AI_GENERATED_DIR = path.join(UPLOADS_ROOT_DIR, 'ai-generated');
const ADMIN_ASSETS_DIR = path.join(UPLOADS_ROOT_DIR, 'admin-assets');

// Garante que os diretórios existam na inicialização
[UPLOADS_ROOT_DIR, USER_DRAWINGS_DIR, AI_GENERATED_DIR, ADMIN_ASSETS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Filtro para aceitar apenas imagens
const fileFilter = (req, file, cb) => {
  if (!file) {
    // Se nenhum arquivo for enviado, não retorne erro, apenas continue.
    // A validação de "arquivo obrigatório" deve ser feita no serviço.
    return cb(null, false);
  }

  const allowedMimeTypes = /jpeg|jpg|png|gif|webp/;
  const mimetype = allowedMimeTypes.test(file.mimetype);
  const extname = allowedMimeTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Erro: O arquivo deve ser uma imagem válida (jpeg, jpg, png, gif, webp).'));
};

// --- Configuração para uploads de Desenhos de Usuário ---
const userDrawingStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, USER_DRAWINGS_DIR);
  },
  filename: (req, file, cb) => {
    // CORREÇÃO CRÍTICA:
    // Garante que temos um nome de arquivo original para trabalhar.
    // Se não tiver, gera um nome com extensão padrão '.png'.
    const originalName = file.originalname || 'fallback.png';
    const extension = path.extname(originalName);
    const uniqueFilename = `${uuidv4()}${extension}`;
    cb(null, uniqueFilename);
  }
});

const uploadUserDrawing = multer({
  storage: userDrawingStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Aumentado para 10MB
  fileFilter: fileFilter,
});

// --- Configuração para uploads de Assets do Admin ---
const adminAssetStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ADMIN_ASSETS_DIR);
  },
  filename: (req, file, cb) => {
    const originalName = path.basename(file.originalname, path.extname(file.originalname));
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    cb(null, `${originalName.substring(0, 50).replace(/[^a-zA-Z0-9-]/g, '')}-${timestamp}${extension}`);
  }
});

const uploadAdminAsset = multer({
  storage: adminAssetStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: fileFilter,
});

module.exports = { uploadUserDrawing, uploadAdminAsset };