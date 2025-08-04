// src/Features-Admin/LeonardoAdmin/LeonardoAdmin.service.js

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { LeonardoDataset, LeonardoElement, DatasetImage } = require('../../models'); // Adicionado DatasetImage

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
      const newLocalDataset = await LeonardoDataset.create({
        leonardoDatasetId: leonardoDatasetId,
        name: name,
        description: description,
      });
      return newLocalDataset;
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
    if (!file) throw new Error('Nenhum arquivo fornecido para upload.');
    const localDataset = await LeonardoDataset.findByPk(localDatasetId);
    if (!localDataset) throw new Error('Dataset não encontrado na base de dados local.');
    try {
      const presignedResponse = await axios.post(
        `${this.apiUrl}/datasets/${localDataset.leonardoDatasetId}/upload`,
        { extension: file.mimetype.split('/')[1] },
        { headers: this.headers }
      );
      const uploadDetails = presignedResponse.data.uploadDatasetImage;
      const s3UploadUrl = uploadDetails.url;
      const s3UploadFields = JSON.parse(uploadDetails.fields);
      const leonardoImageId = uploadDetails.id;

      // Salva no banco de dados local ANTES de fazer o upload para o S3
      await DatasetImage.create({
          leonardoImageId: leonardoImageId,
          datasetId: localDataset.id
      });

      const formData = new FormData();
      for (const key in s3UploadFields) {
        formData.append(key, s3UploadFields[key]);
      }
      formData.append('file', fs.createReadStream(file.path));
      await axios.post(s3UploadUrl, formData, { headers: formData.getHeaders() });
      return { message: 'Imagem enviada com sucesso para o dataset.', imageId: leonardoImageId };
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
      await localDataset.destroy(); // Isso vai deletar em cascata as DatasetImage associadas
      return { message: 'Dataset deletado com sucesso em ambos os sistemas.' };
    } catch (error) {
        console.error('Erro ao deletar dataset:', error.response ? error.response.data : error.message);
        throw new Error('Falha ao deletar o dataset.');
    }
  }

  // --- NOVA FUNÇÃO PARA DELETAR IMAGEM ---
  async deleteImageFromDataset(localDatasetId, leonardoImageId) {
    const localDataset = await LeonardoDataset.findByPk(localDatasetId);
    if (!localDataset) {
        throw new Error('Dataset não encontrado na base de dados local.');
    }
    
    try {
        // Deleta na API do Leonardo
        await axios.delete(`${this.apiUrl}/datasets/${localDataset.leonardoDatasetId}/upload/${leonardoImageId}`, { headers: this.headers });

        // Deleta no banco de dados local
        const imageRecord = await DatasetImage.findOne({ where: { leonardoImageId: leonardoImageId, datasetId: localDataset.id } });
        if (imageRecord) {
            await imageRecord.destroy();
        }

        return { message: 'Imagem deletada com sucesso.' };
    } catch (error) {
        const apiError = error.response ? error.response.data : error.message;
        console.error(`Erro ao deletar imagem ${leonardoImageId} do dataset ${localDataset.leonardoDatasetId}:`, apiError);
        throw new Error(`Falha ao deletar a imagem: ${apiError.error || JSON.stringify(apiError)}`);
    }
  }
  // --- FIM DA NOVA FUNÇÃO ---


  // ======================================================
  // MÉTODOS PARA GERENCIAMENTO DE ELEMENTS (LoRAs)
  // ======================================================

 async listAllElements() {
    try {
      const response = await axios.get(`${this.apiUrl}/elements/user/${this.userId}`, { headers: this.headers });
      const leonardoElements = response.data?.user_loras || [];

      for (const element of leonardoElements) {
        const sourceLeonardoDatasetId = element.datasetId;
        let localDataset = null;
        if (sourceLeonardoDatasetId) {
            localDataset = await LeonardoDataset.findOne({ where: { leonardoDatasetId: sourceLeonardoDatasetId } });
        }

        let localElement = await LeonardoElement.findOne({ where: { leonardoElementId: String(element.id) } });

        if (localElement) {
          const updateData = {
            name: element.name || 'Elemento Sem Nome',
            description: element.description,
            status: element.status,
          };

          if (localDataset) {
            updateData.sourceDatasetId = localDataset.id;
          }

          await localElement.update(updateData);
        } else {
          await LeonardoElement.create({
            leonardoElementId: String(element.id),
            name: element.name || 'Elemento Sem Nome',
            description: element.description,
            status: element.status,
            sourceDatasetId: localDataset ? localDataset.id : null,
            basePrompt: '{{GPT_OUTPUT}}'
          });
        }
      }

      return LeonardoElement.findAll({
        include: [{ model: LeonardoDataset, as: 'sourceDataset', attributes: ['name'] }],
        order: [['createdAt', 'DESC']],
      });
    } catch (error) {
      console.error('Erro ao listar elements:', error.message);
      throw new Error('Falha ao buscar a lista de Elements no Leonardo.AI.');
    }
  }

  async trainNewElement(trainingData) {
    const { name, localDatasetId, description, instance_prompt, basePrompt } = trainingData;
    const localDataset = await LeonardoDataset.findByPk(localDatasetId);
    if (!localDataset) {
      throw new Error('Dataset de origem não encontrado em nossa base de dados.');
    }

   const payload = {
      name,
      description: description || "",
      datasetId: localDataset.leonardoDatasetId,
      instance_prompt: instance_prompt || "",
      
      lora_focus: 'Style', // Ou lora_type, dependendo da sua versão de API
      sd_version: 'FLUX_DEV',
      resolution: 1024,

      num_train_epochs: 135,
      // ESTA LINHA DEVE SER AJUSTADA:
      learning_rate: 0.00003, // Certifique-se de que este valor está EXATAMENTE assim ou menor, como 0.00001, 0.00002
      train_text_encoder: true,
    };

    try {
      console.log('[LeonardoAdmin] Enviando requisição para treinar novo elemento...');
      const response = await axios.post(`${this.apiUrl}/elements`, payload, { headers: this.headers });

      const elementId = response.data?.sdTrainingJob?.id;
      if (!elementId) {
        throw new Error('A API do Leonardo não retornou um ID de elemento válido para o job de treinamento.');
      }

      const newElement = await LeonardoElement.create({
        leonardoElementId: String(elementId),
        name: name,
        description: description,
        status: 'PENDING',
        sourceDatasetId: localDataset.id,
        basePrompt: basePrompt ? `${basePrompt}, {{GPT_OUTPUT}}` : '{{GPT_OUTPUT}}',
      });

      return newElement;

    } catch (error) {
      const apiError = error.response ? error.response.data : error.message;
      console.error('Erro ao iniciar treinamento de elemento:', apiError);
      const errorMessage = apiError.error || JSON.stringify(apiError);
      throw new Error(`Falha ao iniciar o treinamento do elemento: ${errorMessage}`);
    }
  }

  async getElementDetails(localElementId) {
    const localElement = await LeonardoElement.findByPk(localElementId, {
      include: [{ model: LeonardoDataset, as: 'sourceDataset', attributes: ['name'] }]
    });
    if (!localElement) throw new Error('Elemento não encontrado na base de dados local.');
    return localElement;
  }

  async deleteElement(localElementId) {
    const localElement = await LeonardoElement.findByPk(localElementId);
    if (!localElement) throw new Error('Elemento não encontrado na base de dados local.');
    try {
      await axios.delete(`${this.apiUrl}/elements/${localElement.leonardoElementId}`, { headers: this.headers });
      await localElement.destroy();
      return { message: 'Elemento deletado com sucesso em ambos os sistemas.' };
    } catch (error) {
      console.error('Erro ao deletar elemento:', error.response ? error.response.data : error.message);
      throw new Error('Falha ao deletar o elemento.');
    }
  }

   async updateElement(localElementId, updateData) {
    const element = await LeonardoElement.findByPk(localElementId);
    if (!element) {
        throw new Error('Elemento não encontrado na base de dados local.');
    }
    const { basePrompt } = updateData;
    
    let finalBasePrompt = basePrompt || '';
    if (!finalBasePrompt.includes('{{GPT_OUTPUT}}')) {
        finalBasePrompt = finalBasePrompt ? `${finalBasePrompt.replace(/,?\s*\{\{GPT_OUTPUT\}\}\s*/g, '')}, {{GPT_OUTPUT}}` : '{{GPT_OUTPUT}}';
    }

    await element.update({ basePrompt: finalBasePrompt });
    return element;
  }
}

module.exports = new LeonardoAdminService();