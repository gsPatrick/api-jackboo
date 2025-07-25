// src/Features-Admin/LeonardoAdmin/LeonardoAdmin.service.js

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { LeonardoDataset, LeonardoElement, DatasetImage } = require('../../models');

class LeonardoAdminService {
  /**
   * Configura as variáveis de conexão com a API do Leonardo.AI.
   */
  constructor() {
    this.token = process.env.LEONARDO_API_KEY;
    this.apiUrl = 'https://cloud.leonardo.ai/api/rest/v1';
    
    this.userId = 'bd50f328-6afd-4493-8b75-9bfe21beab8d'; 

    if (!this.token) {
      throw new Error('LEONARDO_API_KEY deve estar configurada no seu arquivo .env.');
    }
    if (this.userId === 'SEU_ID_DE_USUARIO_LEONARDO_AQUI' || !this.userId) {
        console.warn('[LeonardoAdminService] AVISO: O ID de usuário do Leonardo não foi configurado.');
    }

    this.headers = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      'accept': 'application/json',
    };
  }

  // ======================================================
  // MÉTODOS PARA GERENCIAMENTO DE DATASETS
  // ======================================================

  async listDatasets() {
    return LeonardoDataset.findAll({ order: [['name', 'ASC']] });
  }

  async createDataset(name, description) {
    try {
      const response = await axios.post(`${this.apiUrl}/datasets`, { name, description }, { headers: this.headers });
      const leonardoDatasetId = response.data?.insert_datasets_one?.id;
      if (!leonardoDatasetId) {
        throw new Error('A API do Leonardo não retornou um ID de dataset válido.');
      }
      return LeonardoDataset.create({
        leonardoDatasetId,
        name,
        description,
      });
    } catch (error) {
      console.error('Erro ao criar dataset:', error.response ? error.response.data : error.message);
      throw new Error('Falha ao criar o dataset no Leonardo.AI.');
    }
  }

  async getDatasetDetails(localDatasetId) {
    const localDataset = await LeonardoDataset.findByPk(localDatasetId);
    if (!localDataset) throw new Error('Dataset não encontrado na base de dados local.');

    try {
      const response = await axios.get(`${this.apiUrl}/datasets/${localDataset.leonardoDatasetId}`, { headers: this.headers });
      return response.data?.datasets_by_pk;
    } catch (error) {
      console.error('Erro ao buscar detalhes do dataset:', error.response ? error.response.data : error.message);
      throw new Error('Falha ao buscar detalhes do dataset no Leonardo.AI.');
    }
  }

  async uploadImageToDataset(localDatasetId, file) {
    const localDataset = await LeonardoDataset.findByPk(localDatasetId);
    if (!localDataset) throw new Error('Dataset não encontrado na base de dados local.');

    try {
      const presignedResponse = await axios.post(
        `${this.apiUrl}/datasets/${localDataset.leonardoDatasetId}/upload`,
        { extension: file.mimetype.split('/')[1] },
        { headers: this.headers }
      );

      const { url, fields, id: leonardoImageId } = presignedResponse.data.uploadDatasetImage;
      const s3UploadFields = JSON.parse(fields);

      const formData = new FormData();
      for (const key in s3UploadFields) {
        formData.append(key, s3UploadFields[key]);
      }
      formData.append('file', fs.createReadStream(file.path));

      await axios.post(url, formData, { headers: formData.getHeaders() });
      
      await DatasetImage.create({
          leonardoImageId: leonardoImageId,
          datasetId: localDataset.id
      });

      return { message: 'Imagem enviada com sucesso.', imageId: leonardoImageId };
    } catch (error) {
      console.error('Erro no processo de upload:', error.response ? error.response.data : error.message);
      throw new Error('Falha ao enviar imagem para o dataset no Leonardo.AI.');
    }
  }

  async deleteDataset(localDatasetId) {
    const localDataset = await LeonardoDataset.findByPk(localDatasetId);
    if (!localDataset) throw new Error('Dataset não encontrado na base de dados local.');
    
    try {
      await axios.delete(`${this.apiUrl}/datasets/${localDataset.leonardoDatasetId}`, { headers: this.headers });
      await localDataset.destroy();
      return { message: 'Dataset deletado com sucesso.' };
    } catch (error) {
        console.error('Erro ao deletar dataset:', error.response ? error.response.data : error.message);
        throw new Error('Falha ao deletar o dataset.');
    }
  }

  // ======================================================
  // MÉTODOS PARA GERENCIAMENTO DE ELEMENTS (LoRAs)
  // ======================================================

  async listAllElements() {
    try {
      const response = await axios.get(`${this.apiUrl}/elements/user/${this.userId}`, { headers: this.headers });
      const leonardoElements = response.data?.user_elements || [];

      for (const element of leonardoElements) {
        const localDataset = await LeonardoDataset.findOne({ where: { leonardoDatasetId: element.datasetId } });
        await LeonardoElement.upsert({
            leonardoElementId: String(element.id),
            name: element.name || 'Elemento Sem Nome',
            description: element.description,
            status: element.status,
            sourceDatasetId: localDataset ? localDataset.id : null,
        });
      }

      return LeonardoElement.findAll({
        include: [{ model: LeonardoDataset, as: 'sourceDataset', attributes: ['name'] }],
        order: [['createdAt', 'DESC']],
      });
      
    } catch (error) {
      console.error('Erro ao listar elements:', error.response ? error.response.data : error.message);
      throw new Error('Falha ao buscar a lista de Elements.');
    }
  }
async trainNewElement(trainingData) {
    const { name, localDatasetId, lora_focus, description, instance_prompt } = trainingData;
    const localDataset = await LeonardoDataset.findByPk(localDatasetId);
    if (!localDataset) {
      throw new Error('Dataset de origem não encontrado.');
    }

    // Validação final e construção do payload
    if (!instance_prompt) {
        throw new Error('O campo "Instance Prompt" é obrigatório para o treinamento.');
    }

    const payload = {
      name,
      description: description || "",
      datasetId: localDataset.leonardoDatasetId,
      lora_focus,
      instance_prompt: instance_prompt, // <-- CORREÇÃO: Enviando sempre
      sd_version: 'FLUX_DEV',
      num_train_epochs: 135,
      learning_rate: 0.0005,
      train_text_encoder: true,
      resolution: 1024,
    };

    try {
      console.log('[LeonardoAdmin] Enviando requisição para treinar novo elemento com payload:', payload);
      const response = await axios.post(`${this.apiUrl}/elements`, payload, { headers: this.headers });
      const elementId = response.data?.sdTrainingJob?.id;
      if (!elementId) {
        throw new Error('A API não retornou um ID de job de treinamento válido.');
      }

      return LeonardoElement.create({
        leonardoElementId: String(elementId),
        name,
        description,
        status: 'PENDING',
        sourceDatasetId: localDataset.id,
      });

    } catch (error) {
      const errorDetails = error.response ? error.response.data : error.message;
      console.error('Erro ao iniciar treinamento:', errorDetails);
      throw new Error('Falha ao iniciar o treinamento do elemento.');
    }
  } 
  
  async getElementDetails(localElementId) {
    const localElement = await LeonardoElement.findByPk(localElementId);
    if (!localElement) throw new Error('Elemento não encontrado.');

    try {
      const response = await axios.get(`${this.apiUrl}/elements/${localElement.leonardoElementId}`, { headers: this.headers });
      const details = response.data?.elements_by_pk;
      if (details && details.status !== localElement.status) {
        await localElement.update({ status: details.status });
      }
      return details;
    } catch (error) {
      console.error('Erro ao buscar detalhes do elemento:', error.response ? error.response.data : error.message);
      throw new Error('Falha ao buscar detalhes do elemento.');
    }
  }

  async deleteElement(localElementId) {
    const localElement = await LeonardoElement.findByPk(localElementId);
    if (!localElement) throw new Error('Elemento não encontrado.');

    try {
      await axios.delete(`${this.apiUrl}/elements/${localElement.leonardoElementId}`, { headers: this.headers });
      await localElement.destroy();
      return { message: 'Elemento deletado com sucesso.' };
    } catch (error) {
      console.error('Erro ao deletar elemento:', error.response ? error.response.data : error.message);
      throw new Error('Falha ao deletar o elemento.');
    }
  }
}

// ESTA É A LINHA CRÍTICA. Garante que estamos exportando um objeto com todos os métodos.
module.exports = new LeonardoAdminService();