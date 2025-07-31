// src/Features-Admin/LeonardoAdmin/LeonardoAdmin.routes.js
const { Router } = require('express');
const controller = require('./LeonardoAdmin.controller');
const { isAuthenticated, isAdmin } = require('../../Features/Auth/Auth.middleware');
const { uploadAdminAsset } = require('../../Utils/multerConfig');

const router = Router();
router.use(isAuthenticated, isAdmin);

// --- Rotas para Gerenciamento de Datasets ---

router.get('/datasets', controller.listDatasets);
router.post('/datasets', controller.createDataset);
router.get('/datasets/:id', controller.getDatasetDetails);

router.post(
    '/datasets/:id/upload',
    uploadAdminAsset.single('datasetImage'),
    controller.uploadImage
);

router.delete('/datasets/:id', controller.deleteDataset);

// --- NOVA ROTA PARA DELETAR IMAGEM ESPECÍFICA ---
router.delete('/datasets/:datasetId/images/:imageId', controller.deleteDatasetImage);
// --- FIM DA NOVA ROTA ---


// --- Rotas para Gerenciamento de Elements (LoRAs) ---

router.get('/elements', controller.listElements);
router.post('/elements/train', controller.trainElement);
router.get('/elements/:id', controller.getElementDetails);
router.delete('/elements/:id', controller.deleteElement);
router.put('/elements/:id', controller.updateElement);


module.exports = router;