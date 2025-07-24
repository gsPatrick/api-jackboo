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
   * Faz o upload de uma imagem local para os servidores da Leonardo.Ai.
   * (Não modificado)
   */
  async uploadImageToLeonardo(filePath, mimetype) {
    try {
      const extension = mimetype.split('/')[1];
      if (!['png', 'jpg', 'jpeg', 'webp'].includes(extension)) {
        throw new Error(`Extensão de arquivo não suportada para upload para Leonardo.Ai: ${extension}`);
      }

      const presignedUrlPayload = { extension: extension };
      const presignedResponse = await axios.post(`${this.apiUrl}/init-image`, presignedUrlPayload, { headers: this.headers });
      
      const uploadDetails = presignedResponse.data.uploadInitImage;
      const leonardoImageId = uploadDetails.id;
      const s3UploadUrl = uploadDetails.url;
      const s3UploadFields = JSON.parse(uploadDetails.fields); 

      const formData = new FormData();
      for (const key in s3UploadFields) {
        formData.append(key, s3UploadFields[key]);
      }
      formData.append('file', fs.createReadStream(filePath)); 

      await axios.post(s3UploadUrl, formData, {
        headers: formData.getHeaders(),
        maxBodyLength: Infinity,
        maxContentLength: Infinity,
      });

      console.log(`[LeonardoService] Imagem guia local ${filePath} carregada com sucesso para Leonardo.Ai com ID: ${leonardoImageId}`);
      return leonardoImageId;

    } catch (error) {
      const status = error.response?.status;
      const details = error.response?.data?.error || error.response?.data?.details || 'Erro interno durante o upload da imagem.';
      console.error(`[LeonardoService] Falha ao carregar imagem guia para Leonardo.Ai: [${status || 'N/A'}] ${JSON.stringify(details)}`);
      throw new Error(`Falha ao carregar imagem guia para Leonardo.Ai: [${status || 'N/A'}] ${JSON.stringify(details)}`);
    }
  }


  /**
   * Inicia o processo de geração de imagem de personagem na Leonardo.Ai.
   * (Não modificado - já era flexível)
   * @param {string} prompt - O prompt de texto completo para a geração.
   * @param {string} leonardoInitImageId - O ID da imagem guia.
   * @returns {Promise<string>} O ID do job de geração.
   */
  async startImageGeneration(prompt, leonardoInitImageId) { 
    const generationPayload = {
      prompt: prompt,
      sd_version: "FLUX_DEV", 
      userElements: [{ userLoraId: 106054, weight: 1 }],
      num_images: 4,
      width: 1120,
      height: 1120,
      controlnets: [{ preprocessorId: 299, initImageType: "UPLOADED", initImageId: leonardoInitImageId, strengthType: "Mid" }],
      contrast: 3.5,
      ultra: false,
      styleUUID: "111dc692-d470-4eec-b791-3475abac4c46", 
      modelId: "b2614463-296c-462a-9586-aafdb8f00e36", 
      scheduler: "LEONARDO", 
      public: true,          
      nsfw: true,            
    };

    try {
      console.log('[LeonardoService] Iniciando geração (payload final). Payload:', JSON.stringify(generationPayload, null, 2));
      const response = await axios.post(`${this.apiUrl}/generations`, generationPayload, { headers: this.headers });
      const generationId = response.data?.sdGenerationJob?.generationId;
      if (!generationId) {
        throw new Error('A API do Leonardo não retornou um ID de geração válido.');
      }
      return generationId;
    } catch (error) {
      const status = error.response?.status;
      const details = error.response?.data?.error || error.response?.data?.details || 'Erro interno.';
      console.error(`[LeonardoService] Falha na comunicação com a API do Leonardo: [${status || 'N/A'}] ${JSON.stringify(details)}`);
      throw new Error(`Falha na comunicação com a API do Leonardo: [${status || 'N/A'}] ${JSON.stringify(details)}`);
    }
  }
  
  /**
   * Verifica o status de uma geração de imagem.
   * (Não modificado)
   */
  async checkGenerationStatus(generationId) {
    try {
      const response = await axios.get(`${this.apiUrl}/generations/${generationId}`, { headers: this.headers });
      const generationData = response.data?.generations_by_pk;

      if (!generationData) { throw new Error("Resposta inválida ao verificar o status da geração."); }

      console.log(`[LeonardoService] Polling... Status da geração ${generationId}: ${generationData.status}`);

      if (generationData.status === 'COMPLETE') {
        const imageUrl = generationData.generated_images?.[0]?.url;
        if (!imageUrl) { throw new Error("Geração completa, mas a URL da imagem não foi encontrada."); }
        return { isComplete: true, imageUrl: imageUrl };
      }
      
      if (generationData.status === 'FAILED') { throw new Error("A geração da imagem no Leonardo falhou."); }

      return { isComplete: false, imageUrl: null };
    } catch (error) {
      console.error(`[LeonardoService] Erro ao verificar o status da geração ${generationId}:`, error.response ? error.response.data : error.message);
      throw new Error(`Erro ao verificar o status da geração: ${error.message}`);
    }
  }

  /**
   * MODIFICADO: Inicia a geração de uma PÁGINA DE COLORIR na Leonardo.Ai.
   * @param {string} finalPrompt - O prompt de texto completo e já formatado para a página.
   * @returns {Promise<string>} O ID do job de geração.
   */
  async startColoringPageGeneration(finalPrompt) { 
    if (!finalPrompt) {
        throw new Error('[LeonardoService] O prompt para a geração da página de colorir não foi fornecido.');
    }

    const generationPayload = {
      prompt: finalPrompt, // Usa o prompt dinâmico recebido
      sd_version: "FLUX_DEV",
      modelId: "b2614463-296c-462a-9586-aafdb8f00e36",
      elements: [{ akUUID: "93cec898-0fb0-4fb0-9f18-8b8423560a1d", weight: 0.10 }],
      userElements: [{ userLoraId: 106054, weight: 0.80 }],
      num_images: 1,
      width: 1024,
      height: 1024,
      contrast: 2.5,
      scheduler: "LEONARDO",
      guidance_scale: 7,
      public: true,
      nsfw: true,
      ultra: false,
    };

    try {
      console.log('[LeonardoService] Iniciando geração de PÁGINA DE COLORIR. Payload:', JSON.stringify(generationPayload, null, 2));
      const response = await axios.post(`${this.apiUrl}/generations`, generationPayload, { headers: this.headers });
      const generationId = response.data?.sdGenerationJob?.generationId;
      if (!generationId) {
        throw new Error('A API do Leonardo não retornou um ID de geração válido para a página de colorir.');
      }
      console.log(`[LeonardoService] Geração de página de colorir iniciada com sucesso. Job ID: ${generationId}`);
      return generationId;
    } catch (error) {
      const status = error.response?.status;
      const details = error.response?.data?.error || error.response?.data?.details || 'Erro interno.';
      console.error(`[LeonardoService] Falha na comunicação com a API do Leonardo (página de colorir): [${status || 'N/A'}] ${JSON.stringify(details)}`);
      throw new Error(`Falha na comunicação com a API do Leonardo: [${status || 'N/A'}] ${JSON.stringify(details)}`);
    }
  }
}

module.exports = new LeonardoService();