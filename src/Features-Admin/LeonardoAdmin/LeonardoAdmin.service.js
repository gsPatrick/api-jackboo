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
    
    // ========================================================================
    // ATENÇÃO: ID de usuário HARDCODED conforme solicitado.
    // Substitua o valor abaixo pelo seu ID de usuário real da Leonardo.AI.
    this.userId = 'SEU_ID_DE_USUARIO_LEONARDO_AQUI'; 
    // ========================================================================

    if (!this.token) {
      throw new Error('LEONARDO_API_KEY deve estar configurada no seu arquivo .env.');
    }
    if (this.userId === 'SEU_ID_DE_USUARIO_LEONARDO_AQUI' || !this.userId) {
        console.warn('[LeonardoAdminService] AVISO: O ID de usuário do Leonardo não foi configurado. As funcionalidades de "Elements" não funcionarão corretamente.');
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

  /**
   * Lista os datasets que estão registrados na nossa base de dados.
   * @returns {Promise<LeonardoDataset[]>}
   */
  async listDatasets() {
    return LeonardoDataset.findAll({ order: [['name', 'ASC']] });
  }

  /**
   * Cria um dataset na API do Leonardo e salva a referência no nosso DB.
   * @param {string} name - Nome do dataset.
   * @param {string} description - Descrição opcional.
   * @returns {Promise<LeonardoDataset>}
   */
  async createDataset(name, description) {
    try {
      console.log(`[LeonardoAdmin] Criando dataset "${name}" na API do Leonardo...`);
      const response = await axios.post(`${this.apiUrl}/datasets`, { name, description }, { headers: this.headers });

      const leonardoDatasetId = response.data?.insert_datasets_one?.id;
      if (!leonardoDatasetId) {
        throw new Error('A API do Leonardo não retornou um ID de dataset válido.');
      }
      console.log(`[LeonardoAdmin] Dataset criado com sucesso na Leonardo. ID: ${leonardoDatasetId}`);

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

  /**
   * Busca detalhes de um dataset específico na API do Leonardo.
   * @param {number} localDatasetId - O ID do dataset na nossa tabela.
   * @returns {Promise<object>}
   */
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

  /**
   * Faz o upload de uma imagem do nosso servidor para um dataset no Leonardo.
   * @param {number} localDatasetId - O ID do dataset na nossa tabela.
   * @param {object} file - O objeto 'file' do Multer.
   * @returns {Promise<{message: string, imageId: string}>}
   */
  async uploadImageToDataset(localDatasetId, file) {
    if (!file) throw new Error('Nenhum arquivo fornecido para upload.');

    const localDataset = await LeonardoDataset.findByPk(localDatasetId);
    if (!localDataset) throw new Error('Dataset não encontrado na base de dados local.');

    try {
      console.log('[LeonardoAdmin] Solicitando URL pré-assinada...');
      const presignedResponse = await axios.post(
        `${this.apiUrl}/datasets/${localDataset.leonardoDatasetId}/upload`,
        { extension: file.mimetype.split('/')[1] },
        { headers: this.headers }
      );

      const uploadDetails = presignedResponse.data.uploadDatasetImage;
      const s3UploadUrl = uploadDetails.url;
      const s3UploadFields = JSON.parse(uploadDetails.fields);
      const leonardoImageId = uploadDetails.id;

      console.log(`[LeonardoAdmin] Fazendo upload do arquivo para S3 com ID de imagem: ${leonardoImageId}...`);
      const formData = new FormData();
      for (const key in s3UploadFields) {
        formData.append(key, s3UploadFields[key]);
      }
      formData.append('file', fs.createReadStream(file.path));

      await axios.post(s3UploadUrl, formData, { headers: formData.getHeaders() });

      console.log('[LeonardoAdmin] Upload concluído com sucesso.');
      
      return { message: 'Imagem enviada com sucesso para o dataset.', imageId: leonardoImageId };

    } catch (error) {
      console.error('Erro no processo de upload:', error.response ? error.response.data : error.message);
      throw new Error('Falha ao enviar imagem para o dataset no Leonardo.AI.');
    }
  }

  /**
   * Deleta um dataset no Leonardo e na nossa base de dados.
   * @param {number} localDatasetId - O ID do dataset na nossa tabela.
   * @returns {Promise<{message: string}>}
   */
  async deleteDataset(localDatasetId) {
    const localDataset = await LeonardoDataset.findByPk(localDatasetId);
    if (!localDataset) throw new Error('Dataset não encontrado na base de dados local.');
    
    try {
      console.log(`[LeonardoAdmin] Deletando dataset ${localDataset.leonardoDatasetId} da API do Leonardo...`);
      await axios.delete(`${this.apiUrl}/datasets/${localDataset.leonardoDatasetId}`, { headers: this.headers });

      await localDataset.destroy();

      return { message: 'Dataset deletado com sucesso em ambos os sistemas.' };
    } catch (error) {
        console.error('Erro ao deletar dataset:', error.response ? error.response.data : error.message);
        throw new Error('Falha ao deletar o dataset. Pode ter sido removido apenas de um dos sistemas.');
    }
  }

  // ======================================================
  // MÉTODOS PARA GERENCIAMENTO DE ELEMENTS (LoRAs)
  // ======================================================

  /**
   * Lista todos os elementos personalizados da conta principal do Leonardo e sincroniza com o DB local.
   * @returns {Promise<LeonardoElement[]>}
   */
  async listAllElements() {
    try {
      console.log(`[LeonardoAdmin] Buscando todos os elements para o userId: ${this.userId}...`);
      const response = await axios.get(`${this.apiUrl}/elements/user/${this.userId}`, { headers: this.headers });
      const leonardoElements = response.data?.user_elements || [];

      // Sincroniza com a base de dados local.
      // O ID '1' para sourceDatasetId é um placeholder para elementos criados fora da plataforma.
      // O ideal seria tornar este campo nulo no modelo (allowNull: true).
      for (const element of leonardoElements) {
        await LeonardoElement.findOrCreate({
          where: { leonardoElementId: element.id },
          defaults: {
            leonardoElementId: String(element.id), // Garante que o ID seja string
            name: element.name || 'Elemento Sem Nome',
            description: element.description,
            status: element.status,
            sourceDatasetId: 1, 
          }
        });
      }

      return LeonardoElement.findAll({
        include: [{ model: LeonardoDataset, as: 'sourceDataset', attributes: ['name'] }],
        order: [['createdAt', 'DESC']],
      });
      
    } catch (error) {
      console.error('Erro ao listar elements:', error.response ? error.response.data : error.message);
      throw new Error('Falha ao buscar a lista de Elements no Leonardo.AI.');
    }
  }

  /**
   * Inicia o treinamento de um novo Element (LoRA).
   * @param {object} trainingData - Dados do formulário de treinamento.
   * @returns {Promise<LeonardoElement>}
   */
  async trainNewElement(trainingData) {
    const { name, localDatasetId, lora_focus, description, instance_prompt } = trainingData;

    const localDataset = await LeonardoDataset.findByPk(localDatasetId);
    if (!localDataset) {
      throw new Error('Dataset de origem não encontrado em nossa base de dados.');
    }

    const payload = {
      name,
      description,
      datasetId: localDataset.leonardoDatasetId,
      lora_focus,
      sd_version: 'FLUX_DEV',
      instance_prompt: lora_focus === 'Character' ? instance_prompt : null,
      num_train_epochs: 135,
      learning_rate: 0.0005,
      train_text_encoder: true,
      resolution: 1024,
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
      });

      return newElement;

    } catch (error) {
      console.error('Erro ao iniciar treinamento de elemento:', error.response ? error.response.data : error.message);
      throw new Error('Falha ao iniciar o treinamento do elemento no Leonardo.AI.');
    }
  }
  
  /**
   * Busca os detalhes de um Element e atualiza seu status no nosso DB.
   * @param {number} localElementId - O ID do elemento na nossa tabela.
   * @returns {Promise<object>}
   */
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

  /**
   * Deleta um Element no Leonardo e na nossa base de dados.
   * @param {number} localElementId - O ID do elemento na nossa tabela.
   * @returns {Promise<{message: string}>}
   */
  async deleteElement(localElementId) {
    const localElement = await LeonardoElement.findByPk(localElementId);
    if (!localElement) throw new Error('Elemento não encontrado na base de dados local.');

    try {
      console.log(`[LeonardoAdmin] Deletando elemento ${localElement.leonardoElementId} da API do Leonardo...`);
      await axios.delete(`${this.apiUrl}/elements/${localElement.leonardoElementId}`, { headers: this.headers });

      await localElement.destroy();

      return { message: 'Elemento deletado com sucesso em ambos os sistemas.' };
    } catch (error) {
      console.error('Erro ao deletar elemento:', error.response ? error.response.data : error.message);
      throw new Error('Falha ao deletar o elemento.');
    }
  }
}

module.exports = new LeonardoAdminService();