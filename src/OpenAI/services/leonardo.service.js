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
    try {
      const generationPayload = {
        prompt: prompt,
        modelId: "168f6afd-3d31-4009-adbd-46aedaa92f7b", // Seu ID
        num_images: 1,
        width: 1024,
        height: 1024,
        imagePrompts: [referenceImageUrl],
        imagePromptWeight: 0.7,
        
        // --- AQUI ESTÁ A ADIÇÃO CRÍTICA ---
        // Com base na documentação do 'Generate Images Using Flux'
        contrast: 3.5,
      };

      console.log('[LeonardoService] Iniciando geração (modo Polling). Payload:', JSON.stringify(generationPayload, null, 2));
      const response = await axios.post(`${this.apiUrl}/generations`, generationPayload, { headers: this.headers });
      
      const generationId = response.data?.sdGenerationJob?.generationId;
      if (!generationId) {
        throw new Error('A API do Leonardo não retornou um ID de geração válido.');
      }
      
      console.log(`[LeonardoService] Geração iniciada com sucesso. Job ID: ${generationId}`);
      return generationId;

    } catch (error) {
      const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message;
      throw new Error(`Falha na comunicação com a API do Leonardo: ${errorMessage}`);
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