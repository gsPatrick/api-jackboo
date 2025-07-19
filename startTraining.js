// startTraining.js
require('dotenv').config();
const axios = require('axios');

const API_URL = 'https://cloud.leonardo.ai/api/rest/v1';

// --- COLE O ID DO DATASET QUE VOCÊ JÁ CRIOU E FEZ UPLOAD ---
const DATASET_ID = "b491fafa-e2f0-4ee2-bbbf-ba9b22ca1603";
// -----------------------------------------------------------

if (!LEONARDO_API_KEY) throw new Error('ERRO: LEONARDO_API_KEY não está definida no seu arquivo .env');
if (!DATASET_ID) throw new Error('Você precisa colar o ID do seu dataset no script.');

const headers = {
  'Authorization': `Bearer ${LEONARDO_API_KEY}`,
  'Content-Type': 'application/json',
  'accept': 'application/json',
};

async function trainModel() {
  try {
    console.log(`Iniciando o treinamento do modelo usando o Dataset ID: ${DATASET_ID}...`);
    
    const trainingResponse = await axios.post(`${API_URL}/models`, {
      name: 'jackboo-api-definitivo', // Nome final
      description: 'Modelo Jackboo treinado com fluxo híbrido (upload manual)',
      datasetId: DATASET_ID,
      instance_prompt: 'estiloJackboo',
      modelType: 'GENERAL',
      sd_version: 'v2',
      strength: 'MEDIUM',
      resolution: 768,
    }, { headers });

    const modelId = trainingResponse.data?.sdTrainingJob?.customModelId;
    if (!modelId) {
        console.error("Resposta inesperada ao treinar modelo:", trainingResponse.data);
        throw new Error('Falha ao extrair o ID do modelo da resposta de treinamento.');
    }
    
    console.log('\n\n======================================================');
    console.log('🎉 SUCESSO! TREINAMENTO INICIADO COM SUCESSO! 🎉');
    console.log('======================================================');
    console.log('O treinamento pode levar de 30 minutos a algumas horas.');
    console.log('Você pode acompanhar o progresso na seção "Job Status" do site.');
    console.log('\nO ID do seu novo CUSTOM MODEL é:');
    console.log(`> ${modelId}`);
    console.log('\nGuarde este ID! É ele que você usará no `modelId` do seu arquivo `leonardo.service.js`.');

  } catch (error) {
    const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message;
    console.error('\n❌ ERRO DURANTE O TREINAMENTO:', errorMessage);
  }
}

trainModel();