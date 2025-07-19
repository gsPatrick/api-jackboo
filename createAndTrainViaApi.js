// createAndTrainViaApi.js
require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const API_URL = 'https://cloud.leonardo.ai/api/rest/v1';
const TRAINING_IMAGES_DIR = path.join(__dirname, 'training-images');

if (!LEONARDO_API_KEY) throw new Error('ERRO: LEONARDO_API_KEY não está definida no seu arquivo .env');

// Cabeçalhos para a API do Leonardo
const leonardoHeaders = {
  'Authorization': `Bearer ${LEONARDO_API_KEY}`,
  'Content-Type': 'application/json',
  'accept': 'application/json',
};

async function createAndTrainModel() {
  let datasetId = null;
  try {
    // --- PASSO 1: Criar o Dataset (Funcionando) ---
    console.log('Passo 1: Criando um novo dataset via API...');
    const datasetResponse = await axios.post(`${API_URL}/datasets`, {
      name: 'Jackboo API Dataset Final',
      description: 'Dataset para o modelo Jackboo treinado e gerenciado 100% via API'
    }, { headers: leonardoHeaders });
    
    datasetId = datasetResponse.data?.insert_datasets_one?.id;
    if (!datasetId) throw new Error('Falha ao extrair o ID do dataset da resposta da API.');
    console.log(`✅ Dataset criado com sucesso! ID: ${datasetId}`);

    // --- PASSO 2: Fazer Upload das Imagens (COM A CORREÇÃO FINAL) ---
    console.log('\nPasso 2: Fazendo upload das imagens de treinamento...');
    const imageFiles = fs.readdirSync(TRAINING_IMAGES_DIR).filter(file => /\.(jpg|jpeg|png)$/i.test(file));
    if (imageFiles.length === 0) throw new Error(`Nenhuma imagem encontrada na pasta '${TRAINING_IMAGES_DIR}'`);
    
    console.log(`Encontradas ${imageFiles.length} imagens para upload.`);

    for (const file of imageFiles) {
      const filePath = path.join(TRAINING_IMAGES_DIR, file);
      const extension = path.extname(file).substring(1);

      // 2a. Obter a URL de upload assinada do Leonardo
      const uploadUrlResponse = await axios.post(`${API_URL}/datasets/${datasetId}/upload`, { extension }, { headers: leonardoHeaders });
      const presignedData = uploadUrlResponse.data.uploadDatasetImage;
      const { url: uploadUrl, fields } = presignedData;

      // 2b. Preparar o formulário
      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value);
      });
      formData.append('file', fs.createReadStream(filePath));
      
      // --- AQUI ESTÁ A CORREÇÃO CRÍTICA ---
      // 2c. Usamos o método .submit() do próprio form-data, que é especialista nisso.
      console.log(`  - Enviando '${file}' para o S3...`);
      await new Promise((resolve, reject) => {
        formData.submit(uploadUrl, (err, res) => {
          if (err) {
            return reject(err);
          }
          // O S3 retorna status 204 No Content em caso de sucesso
          if (res.statusCode < 200 || res.statusCode >= 300) {
            let responseBody = '';
            res.on('data', chunk => responseBody += chunk);
            res.on('end', () => reject(new Error(`Falha no upload para o S3. Status: ${res.statusCode}. Resposta: ${responseBody}`)));
          } else {
            res.resume(); // Consome o stream da resposta para liberar memória
            resolve(res);
          }
        });
      });
      console.log(`  - Upload de '${file}' concluído.`);
      // --- FIM DA CORREÇÃO ---
    }
    console.log('✅ Todas as imagens foram enviadas com sucesso para o dataset.');

    // --- PASSO 3: Iniciar o Treinamento do Modelo (Sem mudanças) ---
    console.log('\nPasso 3: Iniciando o treinamento do modelo...');
    const trainingResponse = await axios.post(`${API_URL}/models`, {
      name: 'jackboo-api-final',
      description: 'Modelo Jackboo treinado via API',
      datasetId: datasetId,
      instance_prompt: 'estiloJackboo',
      modelType: 'GENERAL',
      sd_version: 'v2',
      strength: 'MEDIUM',
      resolution: 768,
    }, { headers: leonardoHeaders });

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
    console.log('\nGuarde este ID! É ele que você vai usar no `modelId` do seu arquivo `leonardo.service.js`.');

  } catch (error) {
    console.error('\n❌ ERRO DURANTE O PROCESSO:', error.message);
  }
}

createAndTrainModel();  