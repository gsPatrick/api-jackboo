
const axios = require('axios');

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

  async startImageGeneration(prompt, referenceImageUrl) {
    const generationPayload = {
      prompt: prompt,
      
      // 1. Usamos o ID do MODELO BASE Flux Dev.
      modelId: "b2614463-296c-462a-9586-aafdb8f00e36",
      
      // --- AQUI ESTÁ A CORREÇÃO FINAL ---
      // 2. Trocamos 'loras' por 'elements', como a documentação de uso diz.
      elements: [
        {
          // AQUI PRECISAMOS DO akUUID. RODE O SCRIPT findMyInfo.js
          // DEPOIS DE TREINAR UM NOVO ELEMENT NO SITE.
          akUUID: "COLE_O_AKUUID_DO_SEU_NOVO_ELEMENT_AQUI", 
          weight: 0.8
        }
      ],
      // --- FIM DA CORREÇÃO ---

      num_images: 1,
      width: 1024,
      height: 1024,
      imagePrompts: [referenceImageUrl],
      imagePromptWeight: 0.7,
      alchemy: true,
      presetStyle: 'DYNAMIC',
    };

    try {
      console.log('[LeonardoService] Iniciando geração com Element (tentativa final). Payload:', JSON.stringify(generationPayload, null, 2));
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
      const details = error.response?.data?.error || error.response?.data?.details || 'internal error';
      console.error(`Status: ${status}, Detalhes: ${JSON.stringify(details)}`);
      const finalErrorMessage = `Falha na comunicação com a API do Leonardo: [${status}] ${JSON.stringify(details)}`;
      throw new Error(finalErrorMessage);
    }
  }

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
      throw new Error(`Erro ao verificar o status da geração: ${error.message}`);
    }
  }
}

module.exports = new LeonardoService();