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
    // --- PAYLOAD FINAL E CORRETO, COMBINANDO SUAS DESCOBERTAS ---
    const generationPayload = {
      prompt: prompt,
      
      // 1. Usamos o ID do MODELO BASE que você encontrou nas requisições.
      modelId: "b2614463-296c-462a-9586-aafdb8f00e36", // <-- ID do Flux Dev
      
      // 2. Aplicamos seu ELEMENT (LoRA) sobre ele.
      //    A API parece aceitar o ID numérico diretamente aqui,
      //    mesmo que a documentação antiga mencionasse 'akUUID'.
      //    Vamos usar o que temos certeza que existe.
      loras: [ // A API pode usar 'elements' ou 'loras'. 'loras' é mais comum.
        {
          modelId: 106054, // <-- O ID numérico do seu 'jackboo'
          weight: 0.8     // Peso do seu estilo.
        }
      ],

      num_images: 1,
      width: 1024,
      height: 1024,

      // A imagem de guia (rabisco) para guiar a forma.
      imagePrompts: [referenceImageUrl],
      imagePromptWeight: 0.7,

      // Parâmetros recomendados para o Flux
      alchemy: true,
      presetStyle: 'DYNAMIC',
      contrast: 2.5,
    };

    try {
      console.log('[LeonardoService] Iniciando geração com Element (método final). Payload:', JSON.stringify(generationPayload, null, 2));
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