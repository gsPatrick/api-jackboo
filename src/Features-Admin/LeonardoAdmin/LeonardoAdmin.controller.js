// src/Features-Admin/LeonardoAdmin/LeonardoAdmin.controller.js
const leonardoAdminService = require('./LeonardoAdmin.service');

class LeonardoAdminController {
    async listDatasets(req, res, next) {
        try {
            const datasets = await leonardoAdminService.listDatasets();
            res.status(200).json(datasets);
        } catch (error) {
            next(error);
        }
    }

    async createDataset(req, res, next) {
        try {
            const { name, description } = req.body;
            if (!name) {
                return res.status(400).json({ message: 'O nome do dataset é obrigatório.' });
            }
            const dataset = await leonardoAdminService.createDataset(name, description);
            res.status(201).json(dataset);
        } catch (error) {
            next(error);
        }
    }

    async getDatasetDetails(req, res, next) {
        try {
            const { id } = req.params;
            const details = await leonardoAdminService.getDatasetDetails(id);
            res.status(200).json(details);
        } catch (error) {
            if (error.message.includes('não encontrado')) {
                return res.status(404).json({ message: error.message });
            }
            next(error);
        }
    }
    
    async uploadImage(req, res, next) {
        try {
            const { id } = req.params; // ID do nosso dataset local
            if (!req.file) {
                return res.status(400).json({ message: 'Nenhum arquivo de imagem foi enviado.' });
            }
            const result = await leonardoAdminService.uploadImageToDataset(id, req.file);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    async deleteDataset(req, res, next) {
        try {
            const { id } = req.params;
            const result = await leonardoAdminService.deleteDataset(id);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

    async listElements(req, res, next) {
        try {
            const elements = await leonardoAdminService.listAllElements();
            res.status(200).json(elements);
        } catch (error) {
            next(error);
        }
    }
    
    async trainElement(req, res, next) {
        try {
            const { name, localDatasetId, lora_focus } = req.body;
            if (!name || !localDatasetId || !lora_focus) {
                return res.status(400).json({ message: 'Campos obrigatórios (name, localDatasetId, lora_focus) não fornecidos.'});
            }
            const newElement = await leonardoAdminService.trainNewElement(req.body);
            res.status(202).json(newElement); // 202 Accepted, pois o processo foi iniciado
        } catch (error) {
            next(error);
        }
    }

    async getElementDetails(req, res, next) {
        try {
            const { id } = req.params;
            const details = await leonardoAdminService.getElementDetails(id);
            res.status(200).json(details);
        } catch (error) {
            next(error);
        }
    }

    async deleteElement(req, res, next) {
        try {
            const { id } = req.params;
            const result = await leonardoAdminService.deleteElement(id);
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    }

      // ✅ NOVO MÉTODO ADICIONADO
    async updateElement(req, res, next) {
        try {
            const { id } = req.params;
            const updatedElement = await leonardoAdminService.updateElement(id, req.body);
            res.status(200).json(updatedElement);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new LeonardoAdminController();