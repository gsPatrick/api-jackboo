// src/OpenAI/services/leonardo.service.js

const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

class LeonardoService {
  constructor() {
    this.token = process.env.LEONARDO_API_KEY;
    this.apiUrl = 'https://cloud.leonardo.ai/api/rest/v1';
    if (!this.token) {
      throw new Error('LEONARDO_API_KEY não está configurado.');
    }
    this.headers = {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json',
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
      const extension = mimetype.split('/')[1];
      if (!['png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
        throw new Error(`Extensão de arquivo não suportada para upload para Leonardo.Ai: ${extension}`);
      }

      const presignedUrlPayload = { extension: extension };
      console.log('[LeonardoService] Solicitando URL pré-assinada para upload da imagem guia...');
      const presignedResponse = await axios.post(`${this.apiUrl}/init-image`, presignedUrlPayload, { headers: this.headers });
      
      const uploadDetails = presignedResponse.data.uploadInitImage;
      const leonardoImageId = uploadDetails.id;
      const s3UploadUrl = uploadDetails.url;
      
      const s3UploadFields = JSON.parse(uploadDetails.fields); 

      console.log('[LeonardoService] URL pré-assinada recebida:', s3UploadUrl);
      console.log('[LeonardoService] Campos S3 pré-assinados (parsed) recebidos:', JSON.stringify(s3UploadFields, null, 2));

      const formData = new FormData();
      for (const key in s3UploadFields) {
        formData.append(key, s3UploadFields[key]);
      }
      formData.append('file', fs.createReadStream(filePath)); 

      console.log(`[LeonardoService] Fazendo upload da imagem para S3 (multipart/form-data) com ID: ${leonardoImageId}...`);
      await axios.post(s3UploadUrl, formData, {
        headers: formData.getHeaders(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      console.log(`[LeonardoService] Imagem guia local ${filePath} carregada com sucesso para Leonardo.Ai com ID: ${leonardoImageId}`);
      return leonardoImageId;

    } catch (error) {
      console.error('--- ERRO DETALHADO NO UPLOAD DA IMAGEM PARA LEONARDO ---');
      const status = error.response?.status;
      const details = error.response?.data?.error || error.response?.data?.details || 'Erro interno durante o upload da imagem.';
      console.error(`Status: ${status || 'N/A'}, Detalhes: ${JSON.stringify(details)}`);
      if (axios.isAxiosError(error)) {
          console.error('Axios Error Config:', error.config);
          console.error('Axios Error Request Headers:', error.config.headers);
          console.error('Axios Error Response Data:', error.response?.data);
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
      
      sd_version: "FLUX_DEV", 
      
      // --- CORREÇÃO: Usar 'userElements' com 'userLoraId' ---
      userElements: [ // Use userElements para LoRAs customizadas
        {
          userLoraId: 106054, // O ID numérico da sua LoRA
          weight: 1 // O peso no log de sucesso é 1 para o elemento
        }
      ],
      // REMOVA 'elements' se ele estiver definido em outro lugar, use apenas 'userElements'
      
      num_images: 4, // Alinhado com o log de sucesso (gera 4 imagens)
      width: 1120,   // Alinhado com o log de sucesso
      height: 1120,  // Alinhado com o log de sucesso

      // --- CORREÇÃO: Usar o formato CORRETO de 'controlnets' ---
      controlnets: [
        {
          preprocessorId: 299, // ID do preprocessor para "Style Reference" (encontrado no seu log)
          initImageType: "UPLOADED", // Tipo de imagem guia
          initImageId: leonardoInitImageId, // O ID da imagem guia carregada para Leonardo.Ai
          strengthType: "Mid" // Força de influência do ControlNet (Mid, Low, High)
        }
      ],
      // --- FIM DAS CORREÇÕES ---
      
      contrast: 3.5, // Alinhado com o log de sucesso
      ultra: false, // Alinhado com o log de sucesso (não usar ultra com ControlNet/Elements)
      // alchemy: false, // Se ultra for false, alchemy pode ser omitido ou null
      
      // --- NOVOS PARÂMETROS ALINHADOS COM O LOG DE SUCESSO ---
      styleUUID: "111dc692-d470-4eec-b791-3475abac4c46", // ID do Preset Style usado nas gerações bem-sucedidas
      modelId: "b2614463-296c-462a-9586-aafdb8f00e36", // Modelo "Flux Dev"
      scheduler: "LEONARDO", // Alinhado com o log de sucesso
      guidance_scale: 7, // Alinhado com o log de sucesso
      inferenceSteps: 10, // Alinhado com o log de sucesso
      public: true, // Alinhado com o log de sucesso
      nsfw: true, // Alinhado com o log de sucesso (se aplicável ao seu caso de uso, se não for, defina como false)
      // --- FIM DOS NOVOS PARÂMETROS ---
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
      if (axios.isAxiosError(error)) {
        console.error('Axios Error Config:', error.config);
        console.error('Axios Error Request Headers:', error.config.headers);
        console.error('Axios Error Response Data:', error.response?.data);
      }
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