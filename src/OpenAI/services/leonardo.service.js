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

  async startImageGeneration(prompt, leonardoInitImageId, elementId) { 
    if (!elementId) {
        throw new Error("Um Element (modelo de estilo) deve ser fornecido para a geração.");
    }

    const generationPayload = {
      prompt: prompt,
      // ✅ CORREÇÃO FINAL: Usamos o ID do seu Element como o modelId principal.
      modelId: elementId,
      // ❌ REMOVIDO: sd_version não é mais necessário.
      // ❌ REMOVIDO: userElements não é mais necessário.
      num_images: 4,
      width: 1120,
      height: 1120,
      controlnets: [{ preprocessorId: 299, initImageType: "UPLOADED", initImageId: leonardoInitImageId, strengthType: "Mid" }],
      scheduler: "LEONARDO"
    };

    try {
      console.log('[LeonardoService] Iniciando geração de personagem (payload final):', JSON.stringify(generationPayload, null, 2));
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
  
  async checkGenerationStatus(generationId) {
    try {
      const response = await axios.get(`${this.apiUrl}/generations/${generationId}`, { headers: this.headers });
      const generationData = response.data?.generations_by_pk;

      if (!generationData) { throw new Error("Resposta inválida ao verificar o status da geração."); }

      console.log(`[LeonardoService] Polling... Status da geração ${generationId}: ${generationData.status}`);

      if (generationData.status === 'COMPLETE') {
        const imageUrls = generationData.generated_images?.map(img => img.url) || [];
        if (imageUrls.length === 0) { throw new Error("Geração completa, mas a URL da imagem não foi encontrada."); }
        return { isComplete: true, imageUrl: imageUrls[0] }; // Retorna a primeira imagem por padrão
      }
      
      if (generationData.status === 'FAILED') { throw new Error("A geração da imagem no Leonardo falhou."); }

      return { isComplete: false, imageUrl: null };
    } catch (error) {
      console.error(`[LeonardoService] Erro ao verificar o status da geração ${generationId}:`, error.response ? error.response.data : error.message);
      throw new Error(`Erro ao verificar o status da geração: ${error.message}`);
    }
  }

  async startColoringPageGeneration(finalPrompt, elementId) { 
    if (!elementId) {
        throw new Error("Um Element (modelo de estilo) deve ser fornecido para a geração da página de colorir.");
    }
    const generationPayload = {
      prompt: finalPrompt,
      // ✅ CORREÇÃO FINAL: Usamos o ID do seu Element como o modelId principal.
      modelId: elementId,
      // ✅ Para livros de colorir, podemos AINDA precisar do element base de "coloring page".
      // Se isso falhar, o próximo passo é remover esta linha também.
      elements: [{ akUUID: "93cec898-0fb0-4fb0-9f18-8b8423560a1d", weight: 0.75 }],
      // ❌ REMOVIDO: sd_version e userElements.
      num_images: 1,
      width: 1024,
      height: 1024,
      guidance_scale: 7,
      public: true,
      nsfw: true,
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

  async startStoryIllustrationGeneration(finalPrompt, elementId) {
    if (!elementId) {
        throw new Error("Um Element (modelo de estilo) deve ser fornecido para a geração da ilustração.");
    }
    const generationPayload = {
        prompt: finalPrompt,
        // ✅ CORREÇÃO FINAL: Usamos o ID do seu Element como o modelId principal.
        modelId: elementId,
        // ❌ REMOVIDO: sd_version e userElements.
        num_images: 1,
        width: 1024,
        height: 1024,
        guidance_scale: 7,
        public: true,
        nsfw: true,
    };

    try {
        console.log('[LeonardoService] Iniciando geração de ILUSTRAÇÃO/CAPA. Payload:', JSON.stringify(generationPayload, null, 2));
        const response = await axios.post(`${this.apiUrl}/generations`, generationPayload, { headers: this.headers });
        const generationId = response.data?.sdGenerationJob?.generationId;
        if (!generationId) {
            throw new Error('A API do Leonardo não retornou um ID de geração válido para a ilustração.');
        }
        console.log(`[LeonardoService] Geração de ilustração iniciada com sucesso. Job ID: ${generationId}`);
        return generationId;
    } catch (error) {
        const status = error.response?.status;
        const details = error.response?.data?.error || error.response?.data?.details || 'Erro interno.';
        console.error(`[LeonardoService] Falha na comunicação com a API do Leonardo (ilustração): [${status || 'N/A'}] ${JSON.stringify(details)}`);
        throw new Error(`Falha na comunicação com a API do Leonardo: [${status || 'N/A'}] ${JSON.stringify(details)}`);
    }
  }
}

module.exports = new LeonardoService();