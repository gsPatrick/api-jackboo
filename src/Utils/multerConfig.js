
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// --- DEFINIÇÃO DOS DIRETÓRIOS ---
const UPLOADS_ROOT_DIR = path.resolve(__dirname, '..', '..', 'uploads');
const USER_DRAWINGS_DIR = path.join(UPLOADS_ROOT_DIR, 'user-drawings');
const ADMIN_ASSETS_DIR = path.join(UPLOADS_ROOT_DIR, 'admin-assets');

// Garante que os diretórios existam na inicialização
fs.mkdirSync(USER_DRAWINGS_DIR, { recursive: true });
fs.mkdirSync(ADMIN_ASSETS_DIR, { recursive: true });

// --- FILTRO DE ARQUIVO GENÉRICO ---
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/pjpeg', 'image/png', 'image/gif', 'image/webp'];
  if (file && allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo de imagem inválido.'), false);
  }
};

// --- CONFIGURAÇÃO PARA UPLOAD DE DESENHO DO USUÁRIO ---
const userDrawingStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, USER_DRAWINGS_DIR);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname) || '.png';
    const uniqueFilename = `${uuidv4()}${extension}`;
    cb(null, uniqueFilename);
  }
});

const uploadUserDrawing = multer({
  storage: userDrawingStorage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});


// --- CONFIGURAÇÃO PARA UPLOAD DE ASSETS DO ADMIN (RESTAURADO) ---
const adminAssetStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ADMIN_ASSETS_DIR);
  },
  filename: (req, file, cb) => {
    const originalName = path.basename(file.originalname, path.extname(file.originalname));
    const timestamp = Date.now();
    const extension = path.extname(file.originalname);
    // Cria um nome de arquivo seguro e legível
    const safeOriginalName = originalName.substring(0, 50).replace(/[^a-zA-Z0-9-]/g, '');
    cb(null, `${safeOriginalName}-${timestamp}${extension}`);
  }
});

const uploadAdminAsset = multer({
  storage: adminAssetStorage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});


// --- EXPORTAÇÃO CORRETA ---
// Agora exportamos ambos os middlewares de upload
module.exports = {
  uploadUserDrawing,
  uploadAdminAsset
};