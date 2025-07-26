// src/Utils/multerConfig.js

const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

// Função para garantir que o diretório de upload exista
const ensureUploadsDirExists = (dirPath) => {
    const fullPath = path.resolve(dirPath);
    if (!fs.existsSync(fullPath)) {
        console.log(`[Multer] Diretório não encontrado. Criando: ${fullPath}`);
        fs.mkdirSync(fullPath, { recursive: true });
    }
};

const userDrawingStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'uploads/user-drawings/';
        ensureUploadsDirExists(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});

// ✅ CORREÇÃO: A configuração de storage do admin agora aponta para a mesma pasta do usuário.
const adminAssetStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Salva na mesma pasta do usuário para simplificar o acesso da IA.
        const uploadPath = 'uploads/user-drawings/'; 
        ensureUploadsDirExists(uploadPath);
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const mimetype = allowedTypes.test(file.mimetype);
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
        return cb(null, true);
    }
    cb(new Error('Erro: Apenas arquivos de imagem são permitidos!'));
};

const uploadUserDrawing = multer({
    storage: userDrawingStorage,
    limits: { fileSize: 1024 * 1024 * 5 }, // Limite de 5MB
    fileFilter: fileFilter,
});

const uploadAdminAsset = multer({
    storage: adminAssetStorage, // Agora usa o storage corrigido
    limits: { fileSize: 1024 * 1024 * 10 }, // Limite maior para admin
    fileFilter: fileFilter,
});

module.exports = {
    uploadUserDrawing,
    uploadAdminAsset,
};