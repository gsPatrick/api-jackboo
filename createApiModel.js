// createApiModel.js
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data'); // Importa a biblioteca para upload

const API_URL = 'https://cloud.leonardo.ai/api/rest/v1';
const TRAINING_IMAGES_DIR = path.join(__dirname, 'training-images'); // Nome da sua pasta de imagens

if (!LEONARDO_API_KEY) throw new Error('LEONARDO_API_KEY não está no .env');

const headers = {
  'Authorization': `Bearer ${LEONARDO_API_KEY}`,
  'Content-Type': 'application/json',
  'accept': 'application/json',
};

async function createAndTrainModel() {
  try {
    // --- PASSO 1: Criar o Dataset ---
    console.log('Passo 1: Criando um novo dataset via API...');
    const datasetResponse = await axios.post(`${API_URL}/datasets`, {
      name: 'Jackboo API Dataset',
      description: 'Dataset para treinar o modelo Jackboo para uso via API'
    }, { headers });
    
    const datasetId = datasetResponse.data?.createDataset?.id;
    if (!datasetId) throw new Error('Falha ao criar o dataset.');
    console.log(`✅ Dataset criado com sucesso! ID: ${datasetId}`);

    // --- PASSO 2: Fazer Upload das Imagens para o Dataset ---
    console.log('\nPasso 2: Fazendo upload das imagens de treinamento...');
    const imageFiles = fs.readdirSync(TRAINING_IMAGES_DIR).filter(file => /\.(jpg|jpeg|png)$/i.test(file));
    if (imageFiles.length === 0) throw new Error(`Nenhuma imagem encontrada na pasta '${TRAINING_IMAGES_DIR}'`);
    
    console.log(`Encontradas ${imageFiles.length} imagens para upload.`);

    for (const file of imageFiles) {
      const filePath = path.join(TRAINING_IMAGES_DIR, file);
      const extension = path.extname(file).substring(1);

      // 2a. Obter a URL de upload assinada
      const uploadUrlResponse = await axios.post(`${API_URL}/datasets/${datasetId}/upload`, { extension }, { headers });
      const presignedData = uploadUrlResponse.data.uploadDatasetImage;
      const { url: uploadUrl, fields } = presignedData;
      const imageId = presignedData.id;

      // 2b. Preparar o formulário e fazer o upload para o S3 da Amazon
      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value);
      });
      formData.append('file', fs.createReadStream(filePath));
      
      await axios.post(uploadUrl, formData, { headers: { ...formData.getHeaders() } });
      console.log(`  - Upload de '${file}' concluído. Imagem ID: ${imageId}`);
    }
    console.log('✅ Todas as imagens foram enviadas para o dataset.');

    // --- PASSO 3: Iniciar o Treinamento do Modelo ---
    console.log('\nPasso 3: Iniciando o treinamento do modelo...');
    const trainingResponse = await axios.post(`${API_URL}/models`, {
      name: 'jackboo-api', // Nome para o novo modelo
      description: 'Modelo treinado via API para consistência teste',
      datasetId: datasetId,
      instance_prompt: 'estiloJackboo', // Sua nova trigger word
      modelType: 'STYLE', // Ou o tipo que você preferir
      sd_version: 'v2', // Ou a versão que preferir
      strength: 'MEDIUM',
      resolution: 768,
    }, { headers });

    const modelId = trainingResponse.data?.sdTrainingJob?.customModelId;
    if (!modelId) throw new Error('Falha ao iniciar o treinamento do modelo.');
    
    console.log('\n🎉 SUCESSO! Treinamento iniciado.');
    console.log('O treinamento pode levar de 30 minutos a algumas horas.');
    console.log('Seu novo MODEL ID é:');
    console.log(modelId);
    console.log('\nGuarde este ID! Você vai usá-lo no seu arquivo `leonardo.service.js`.');

  } catch (error) {
    const errorMessage = error.response?.data?.error || error.response?.data?.details || error.message;
    console.error('\n❌ ERRO DURANTE O PROCESSO:', errorMessage);
    if (error.config?.data) console.error('Payload enviado:', error.config.data);
  }
}

createAndTrainModel();