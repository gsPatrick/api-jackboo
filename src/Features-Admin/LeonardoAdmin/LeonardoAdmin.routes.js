// src/Features-Admin/LeonardoAdmin/LeonardoAdmin.routes.js
const { Router } = require('express');
const controller = require('./LeonardoAdmin.controller');
const { isAuthenticated, isAdmin } = require('../../Features/Auth/Auth.middleware');
const { uploadAdminAsset } = require('../../Utils/multerConfig'); // Reutilizando config de upload

const router = Router();
router.use(isAuthenticated, isAdmin);

// --- Rotas para Gerenciamento de Datasets ---

// Lista os datasets salvos na nossa plataforma
router.get('/datasets', controller.listDatasets);

// Cria um novo dataset (no Leonardo e no nosso DB)
router.post('/datasets', controller.createDataset);

// Pega detalhes de um dataset específico da API do Leonardo
router.get('/datasets/:id', controller.getDatasetDetails);

// Faz upload de uma imagem para um dataset específico
router.post(
    '/datasets/:id/upload',
    uploadAdminAsset.single('datasetImage'), // O nome do campo no form-data deve ser 'datasetImage'
    controller.uploadImage
);

// Deleta um dataset (no Leonardo e no nosso DB)
router.delete('/datasets/:id', controller.deleteDataset);


// --- Rotas para Gerenciamento de Elements (LoRAs) ---

// Sincroniza e lista todos os Elements do usuário
router.get('/elements', controller.listElements);

// Inicia o treinamento de um novo Element
router.post('/elements/train', controller.trainElement);

// Busca detalhes de um Element (para verificar status do treinamento)
router.get('/elements/:id', controller.getElementDetails);

// Deleta um Element
router.delete('/elements/:id', controller.deleteElement);

module.exports = router;