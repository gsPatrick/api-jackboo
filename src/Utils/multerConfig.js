const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Define os diretórios de destino dentro da pasta raiz 'uploads'
const UPLOADS_ROOT_DIR = path.join(__dirname, '../..', 'uploads');
const USER_DRAWINGS_DIR = path.join(UPLOADS_ROOT_DIR, 'user-drawings');
const AI_GENERATED_DIR = path.join(UPLOADS_ROOT_DIR, 'ai-generated');
const ADMIN_ASSETS_DIR = path.join(UPLOADS_ROOT_DIR, 'admin-assets'); // Para imagens carregadas pelo admin

// Garante que os diretórios existam
[USER_DRAWINGS_DIR, AI_GENERATED_DIR, ADMIN_ASSETS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Filtro para aceitar apenas imagens
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = /jpeg|jpg|png|gif/;
  const mimetype = allowedMimeTypes.test(file.mimetype);
  const extname = allowedMimeTypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Erro: O arquivo deve ser uma imagem válida (jpeg, jpg, png, gif).'));
};

// --- Configuração para uploads de Desenhos de Usuário ---
const userDrawingStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, USER_DRAWINGS_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `user-drawing-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const uploadUserDrawing = multer({
  storage: userDrawingStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB
  fileFilter: fileFilter,
});

// --- Configuração para uploads de Assets do Admin (Imagens base AI, etc.) ---
const adminAssetStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ADMIN_ASSETS_DIR);
  },
  filename: (req, file, cb) => {
    // Para assets do admin, pode-se usar um nome mais legível com um timestamp para unicidade
    const originalName = path.basename(file.originalname, path.extname(file.originalname));
    const timestamp = Date.now();
    cb(null, `${originalName.substring(0, 50)}-${timestamp}${path.extname(file.originalname)}`); // Limita nome para evitar caminhos longos
  }
});

const uploadAdminAsset = multer({
  storage: adminAssetStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Limite de 10MB para assets admin
  fileFilter: fileFilter,
});

module.exports = { uploadUserDrawing, uploadAdminAsset };