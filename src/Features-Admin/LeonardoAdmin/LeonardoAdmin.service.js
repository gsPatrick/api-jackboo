// src/Features-Admin/LeonardoAdmin/LeonardoAdmin.service.js

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const { LeonardoDataset, LeonardoElement } = require('../../models');

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
  // (Nenhuma mudança nesta seção)
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
      await localDataset.destroy();
      return { message: 'Dataset deletado com sucesso em ambos os sistemas.' };
    } catch (error) {
        console.error('Erro ao deletar dataset:', error.response ? error.response.data : error.message);
        throw new Error('Falha ao deletar o dataset.');
    }
  }

  // ======================================================
  // MÉTODOS PARA GERENCIAMENTO DE ELEMENTS (LoRAs)
  // (Mudança nesta seção)
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

        // Tenta encontrar o elemento no nosso banco
        let localElement = await LeonardoElement.findOne({ where: { leonardoElementId: String(element.id) } });

        if (localElement) {
          // Se encontrou, atualiza os dados que podem mudar (nome, status, etc)
          await localElement.update({
            name: element.name || 'Elemento Sem Nome',
            description: element.description,
            status: element.status,
            sourceDatasetId: localDataset ? localDataset.id : null,
          });
        } else {
          // Se não encontrou, cria um novo, garantindo que o 'name' seja fornecido
          await LeonardoElement.create({
            leonardoElementId: String(element.id),
            name: element.name || 'Elemento Sem Nome',
            description: element.description,
            status: element.status,
            sourceDatasetId: localDataset ? localDataset.id : null,
            basePromptText: '{{DESCRIPTION}}' // Um prompt padrão para novos elements
          });
        }
      }

      // Após a sincronização, busca todos os elementos do nosso banco para retornar
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
    const { name, localDatasetId, description, instance_prompt } = trainingData;
    const localDataset = await LeonardoDataset.findByPk(localDatasetId);
    if (!localDataset) {
      throw new Error('Dataset de origem não encontrado em nossa base de dados.');
    }

    const payload = {
      name,
      description: description || "",
      datasetId: localDataset.leonardoDatasetId,
      instance_prompt: instance_prompt || null, // Permanece opcional
      
      // --- Valores Fixos para Simplificação e Correção do Bug ---
      lora_focus: 'Style',      // Sempre será 'Style'
      sd_version: 'FLUX_DEV',   // Sempre usará o modelo FLUX
      resolution: 1024,         // Adicionado para corrigir o erro "resolution is required"

      // --- Outros parâmetros técnicos que podem ser fixados ---
      num_train_epochs: 135,
      learning_rate: 0.0005,
      train_text_encoder: true,
    };

    try {
      console.log('[LeonardoAdmin] Enviando requisição para treinar novo elemento com payload fixo...');
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
        lora_focus: 'Style', // Salva o foco fixo no DB
      });

      return newElement;

    } catch (error) {
      const apiError = error.response ? error.response.data : error.message;
      console.error('Erro ao iniciar treinamento de elemento:', apiError);
      // Extrai a mensagem de erro da API do Leonardo, se disponível
      const errorMessage = apiError.error || JSON.stringify(apiError);
      throw new Error(`Falha ao iniciar o treinamento do elemento: ${errorMessage}`);
    }
  }

 async trainNewElement(trainingData) {
    const { name, localDatasetId, description, basePrompt } = trainingData;

    const localDataset = await LeonardoDataset.findByPk(localDatasetId);
    if (!localDataset) {
      throw new Error('Dataset de origem não encontrado em nossa base de dados.');
    }

    // Validação do número de imagens no dataset (requer busca de detalhes)
    try {
        const datasetDetails = await this.getDatasetDetails(localDatasetId);
        const imageCount = datasetDetails?.dataset_images?.length || 0;
        if (imageCount < 5) {
            throw new Error(`O dataset "${localDataset.name}" tem apenas ${imageCount} imagem(ns). São necessárias no mínimo 5 para o treinamento.`);
        }
        if (imageCount > 50) {
            throw new Error(`O dataset "${localDataset.name}" tem ${imageCount} imagens. O máximo permitido é 50 para o treinamento.`);
        }
    } catch (error) {
        // Propaga o erro se a validação falhar
        throw new Error(`Falha ao validar dataset: ${error.message}`);
    }


    const payload = {
      name,
      description: description || "",
      datasetId: localDataset.leonardoDatasetId,
      instance_prompt: name.replace(/\s+/g, ''), // Usa o nome como um prompt de instância simples
      
      // --- Parâmetros Técnicos Corrigidos ---
      lora_focus: 'Style',
      sd_version: 'FLUX_DEV',
      resolution: 1024,
      num_train_epochs: 60,       // CORRIGIDO: Valor ajustado para 60 (dentro do limite 30-120)
      learning_rate: 0.00001,     // CORRIGIDO: Valor já ajustado
      train_text_encoder: true,
      strength: "MEDIUM"          // ADICIONADO: Parâmetro presente na requisição de sucesso
    };

    try {
      console.log('[LeonardoAdmin] Enviando requisição para treinar novo elemento...');
      const response = await axios.post(`${this.apiUrl}/elements`, payload, { headers: this.headers });

      const elementId = response.data?.sdTrainingJob?.id;
      if (!elementId) {
        throw new Error('A API do Leonardo não retornou um ID de elemento válido para o job de treinamento.');
      }

      const finalBasePrompt = basePrompt ? `${basePrompt}, {{GPT_OUTPUT}}` : '{{GPT_OUTPUT}}';

      const newElement = await LeonardoElement.create({
        leonardoElementId: String(elementId),
        name: name,
        description: description,
        status: 'PENDING',
        sourceDatasetId: localDataset.id,
        lora_focus: 'Style',
        basePrompt: finalBasePrompt,
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
    const localElement = await LeonardoElement.findByPk(localElementId);
    if (!localElement) throw new Error('Elemento não encontrado na base de dados local.');
    try {
      const response = await axios.get(`${this.apiUrl}/elements/${localElement.leonardoElementId}`, { headers: this.headers });
      const details = response.data?.elements_by_pk;
      if (details && details.status !== localElement.status) {
        await localElement.update({ status: details.status });
      }
      return details;
    } catch (error) {
      console.error('Erro ao buscar detalhes do elemento:', error.response ? error.response.data : error.message);
      throw new Error('Falha ao buscar detalhes do elemento no Leonardo.AI.');
    }
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
    const { name, description, basePrompt } = updateData;
    
    let finalBasePrompt = basePrompt || '';
    if (!finalBasePrompt.includes('{{GPT_OUTPUT}}')) {
        finalBasePrompt = finalBasePrompt ? `${finalBasePrompt.replace(/,?\s*{{GPT_OUTPUT}}\s*/g, '')}, {{GPT_OUTPUT}}` : '{{GPT_OUTPUT}}';
    }

    await element.update({ name, description, basePrompt: finalBasePrompt });
    return element;
  }


}

module.exports = new LeonardoAdminService();