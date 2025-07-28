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
    
   async trainNewElement(trainingData) {
    // Apenas os campos do novo formulário são recebidos
    const { name, localDatasetId, description, basePrompt } = trainingData;

    const localDataset = await LeonardoDataset.findByPk(localDatasetId);
    if (!localDataset) {
      throw new Error('Dataset de origem não encontrado em nossa base de dados.');
    }

    // Payload para a API do Leonardo com valores fixos
    const payload = {
      name,
      description: description || "",
      datasetId: localDataset.leonardoDatasetId,
      lora_focus: 'Style',      // Fixo
      sd_version: 'FLUX_DEV',   // Fixo
      resolution: 1024,         // Fixo
      instance_prompt: name.replace(/\s+/g, ''), // Gera um instance_prompt a partir do nome
      // Outros parâmetros técnicos fixos
      num_train_epochs: 135,
      learning_rate: 0.0005,
      train_text_encoder: true,
    };

    try {
      console.log('[LeonardoAdmin] Enviando requisição para treinar novo elemento com payload simplificado...');
      const response = await axios.post(`${this.apiUrl}/elements`, payload, { headers: this.headers });

      const elementId = response.data?.sdTrainingJob?.id;
      if (!elementId) {
        throw new Error('A API do Leonardo não retornou um ID de elemento válido para o job de treinamento.');
      }

      // Adiciona {{GPT_OUTPUT}} ao prompt base antes de salvar
      const finalBasePrompt = basePrompt ? `${basePrompt}, {{GPT_OUTPUT}}` : '{{GPT_OUTPUT}}';

      const newElement = await LeonardoElement.create({
        leonardoElementId: String(elementId),
        name: name,
        description: description,
        status: 'PENDING',
        sourceDatasetId: localDataset.id,
        lora_focus: 'Style', // Salva o foco fixo no DB
        basePrompt: finalBasePrompt, // Salva o prompt com a placeholder
      });

      return newElement;

    } catch (error) {
      const apiError = error.response ? error.response.data : error.message;
      console.error('Erro ao iniciar treinamento de elemento:', apiError);
      const errorMessage = apiError.error || JSON.stringify(apiError);
      throw new Error(`Falha ao iniciar o treinamento do elemento: ${errorMessage}`);
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