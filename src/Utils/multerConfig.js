// src/Utils/multerConfig.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Função para garantir que o diretório de destino exista
const ensureDirectoryExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`[Multer] Diretório criado: ${dirPath}`);
    }
};

// --- Configuração para Uploads de Usuários (Desenhos) ---
const userDrawingsStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dest = path.resolve(process.cwd(), 'uploads', 'user-drawings');
        ensureDirectoryExists(dest);
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = uuidv4();
        const extension = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${extension}`);
    }
});

// --- Configuração para Uploads de Admin (Assets de Personagens, etc.) ---
const adminAssetsStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        // <<<< CORREÇÃO CRÍTICA AQUI
        // Salva na subpasta 'admin-assets' dentro de 'uploads'
        const dest = path.resolve(process.cwd(), 'uploads', 'admin-assets');
        ensureDirectoryExists(dest);
        cb(null, dest);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = uuidv4();
        const extension = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${extension}`);
    }
});

// Filtro de arquivo para aceitar apenas imagens
const imageFileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de arquivo não suportado! Apenas imagens são permitidas.'), false);
    }
};

// Exporta os middlewares do Multer configurados
const uploadUserDrawing = multer({ storage: userDrawingsStorage, fileFilter: imageFileFilter });
const uploadAdminAsset = multer({ storage: adminAssetsStorage, fileFilter: imageFileFilter });

module.exports = {
    uploadUserDrawing,
    uploadAdminAsset
};