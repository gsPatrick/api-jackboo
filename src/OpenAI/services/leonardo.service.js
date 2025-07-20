// src/OpenAI/services/leonardo.service.js

const axios = require('axios');
const fs = require('fs'); // Importar o módulo 'fs' para ler o arquivo localmente
const FormData = require('form-data'); // Importar 'form-data' para construir o payload de upload de arquivo
const path = require('path'); // Importar o módulo 'path'

class LeonardoService {
  constructor() {
    this.token = process.env.LEONARDO_API_KEY;
    this.apiUrl = 'https://cloud.leonardo.ai/api/rest/v1';
    if (!this.token) {
      throw new Error('LEONARDO_API_KEY não está configurado.');
    }
    this.headers = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json', // Importante para payload JSON
      'accept': 'application/json',
    };
  }

  /**
   * Faz o upload de uma imagem local para os servidores da Leonardo.Ai
   * e retorna o ID interno da imagem gerado por eles.
   * @param {string} filePath - O caminho completo do arquivo local da imagem.
   * @param {string} mimetype - O tipo MIME da imagem (ex: 'image/webp').
   * @returns {Promise<string>} O ID da imagem na Leonardo.Ai.
   */
  async uploadImageToLeonardo(filePath, mimetype) {
    try {
      // Validar extensão e obter URL pré-assinada
      const extension = mimetype.split('/')[1]; // Ex: 'image/webp' -> 'webp'
      if (!['png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
        throw new Error(`Extensão de arquivo não suportada para upload para Leonardo.Ai: ${extension}`);
      }

      const presignedUrlPayload = { extension: extension };
      console.log('[LeonardoService] Solicitando URL pré-assinada para upload da imagem guia...');
      const presignedResponse = await axios.post(`${this.apiUrl}/init-image`, presignedUrlPayload, { headers: this.headers });
      
      const uploadDetails = presignedResponse.data.uploadInitImage;
      const leonardoImageId = uploadDetails.id;
      const s3UploadUrl = uploadDetails.url;
      const s3UploadFields = uploadDetails.fields;

      console.log('[LeonardoService] URL pré-assinada recebida:', s3UploadUrl);
      console.log('[LeonardoService] Campos S3 pré-assinados recebidos:', JSON.stringify(s3UploadFields, null, 2));

      // Construir FormData para o upload para S3
      const formData = new FormData();
      // Adicionar os campos retornados pela Leonardo.Ai (credenciais S3 temporárias) PRIMEIRO
      // Isso é CRÍTICO para o S3 POST.
      for (const key in s3UploadFields) {
        formData.append(key, s3UploadFields[key]);
      }
      
      // Adicionar o arquivo real com o nome 'file', que é o esperado pelo S3 para uploads multipart/form-data
      // REMOVEMOS A OPÇÃO 'filename' AQUI! A propriedade 'key' em s3UploadFields já define o nome do arquivo no S3.
      formData.append('file', fs.createReadStream(filePath), {
        contentType: mimetype, 
      });

      console.log(`[LeonardoService] Fazendo upload da imagem para S3 (multipart/form-data) com ID: ${leonardoImageId}...`);
      // A requisição de upload para o S3 NÃO usa os headers de autenticação da Leonardo.Ai
      // O axios automaticamente define o Content-Type para multipart/form-data quando usa FormData.
      // Usamos formData.getHeaders() para obter o Content-Type correto com o boundary.
      await axios.post(s3UploadUrl, formData, {
        headers: formData.getHeaders(), // ESSENCIAL para FormData
        maxBodyLength: Infinity, // Necessário para arquivos maiores, boa prática
        maxContentLength: Infinity, // Necessário para arquivos maiores, boa prática
      });

      console.log(`[LeonardoService] Imagem guia local ${filePath} carregada com sucesso para Leonardo.Ai com ID: ${leonardoImageId}`);
      return leonardoImageId;

    } catch (error) {
      console.error('--- ERRO DETALHADO NO UPLOAD DA IMAGEM PARA LEONARDO ---');
      const status = error.response?.status;
      const details = error.response?.data?.error || error.response?.data?.details || 'Erro interno durante o upload da imagem.';
      console.error(`Status: ${status || 'N/A'}, Detalhes: ${JSON.stringify(details)}`);
      if (axios.isAxiosError(error)) {
          console.error('Axios Error Config:', error.config); // Configurações da requisição que falhou
          console.error('Axios Error Request Headers:', error.config.headers); // Headers enviados
          console.error('Axios Error Response Data:', error.response?.data); // Dados da resposta do erro (pode ser redundante com 'details')
      }
      throw new Error(`Falha ao carregar imagem guia para Leonardo.Ai: [${status || 'N/A'}] ${JSON.stringify(details)}`);
    }
  }


  /**
   * Inicia o processo de geração de imagem na Leonardo.Ai.
   * @param {string} prompt - O prompt de texto para a geração.
   * @param {string} leonardoInitImageId - O ID da imagem guia já carregada para a Leonardo.Ai.
   * @returns {Promise<string>} O ID do job de geração.
   */
  async startImageGeneration(prompt, leonardoInitImageId) { 
    const generationPayload = {
      prompt: prompt,
      
      // O elemento 'jackboo' tem 'baseModel: "FLUX_DEV"'.
      // Para garantir a compatibilidade e melhor resultado, é crucial usar
      // 'sd_version': "FLUX_DEV" e REMOVER 'modelId'.
      sd_version: "FLUX_DEV", // <-- Use FLUX_DEV para compatibilidade total com seu elemento
      // modelId: "b2614463-296c-462a-9586-aafdb8f00e36", // <-- COMENTE ou REMOVA esta linha!
      
      elements: [
        {
          akUUID: "106054", // Seu ID como STRING, como corrigido antes
          weight: 0.8
        }
      ],

      num_images: 1,
      width: 1024,
      height: 1024,

      init_image_id: leonardoInitImageId, // ID da imagem UPLOADED para Leonardo.Ai
      init_strength: 0.7, // Força de influência da imagem guia (entre 0.1 e 0.9).
      
      contrast: 2.5,
      ultra: true, // Ultra mode é recomendado para FLUX_DEV (incompatível com Alchemy)
      // Certifique-se de que 'alchemy' e 'presetStyle' NÃO estejam presentes se usar 'ultra: true' com FLUX_DEV.
    };

    try {
      console.log('[LeonardoService] Iniciando geração (payload final). Payload:', JSON.stringify(generationPayload, null, 2));
      const response = await axios.post(`${this.apiUrl}/generations`, generationPayload, { headers: this.headers });
      
      const generationId = response.data?.sdGenerationJob?.generationId;
      if (!generationId) {
        console.error("[LeonardoService] Resposta da API não continha um 'generationId'. Resposta completa:", JSON.stringify(response.data, null, 2));
        throw new Error('A API do Leonardo não retornou um ID de geração válido.');
      }
      
      console.log(`[LeonardoService] Geração iniciada com sucesso. Job ID: ${generationId}`);
      return generationId;

    } catch (error) {
      console.error('--- ERRO DETALHADO DA API LEONARDO ---');
      const status = error.response?.status;
      const details = error.response?.data?.error || error.response?.data?.details || 'Erro interno.';
      console.error(`Status: ${status || 'N/A'}, Detalhes: ${JSON.stringify(details)}`);
      throw new Error(`Falha na comunicação com a API do Leonardo: [${status || 'N/A'}] ${JSON.stringify(details)}`);
    }
  }
  
  /**
   * Verifica o status de uma geração de imagem.
   * @param {string} generationId - O ID do job de geração.
   * @returns {Promise<{isComplete: boolean, imageUrl: string|null}>} Status e URL da imagem se completa.
   */
  async checkGenerationStatus(generationId) {
    try {
      const response = await axios.get(`${this.apiUrl}/generations/${generationId}`, { headers: this.headers });
      const generationData = response.data?.generations_by_pk;

      if (!generationData) {
        throw new Error("Resposta inválida ao verificar o status da geração.");
      }

      console.log(`[LeonardoService] Polling... Status da geração ${generationId}: ${generationData.status}`);

      if (generationData.status === 'COMPLETE') {
        const imageUrl = generationData.generated_images?.[0]?.url;
        if (!imageUrl) {
            throw new Error("Geração completa, mas a URL da imagem não foi encontrada.");
        }
        return { isComplete: true, imageUrl: imageUrl };
      }
      
      if (generationData.status === 'FAILED') {
        throw new Error("A geração da imagem no Leonardo falhou.");
      }

      return { isComplete: false, imageUrl: null };
    } catch (error) {
      console.error(`[LeonardoService] Erro ao verificar o status da geração ${generationId}:`, error.response ? error.response.data : error.message);
      throw new Error(`Erro ao verificar o status da geração: ${error.message}`);
    }
  }
}

module.exports = new LeonardoService();