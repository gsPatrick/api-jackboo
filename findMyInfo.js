require('dotenv').config();
const axios = require('axios');

const LEONARDO_API_KEY = '2693b851-8dc6-49cb-8f47-dc42f61d314e';
const API_URL = 'https://cloud.leonardo.ai/api/rest/v1';

if (!LEONARDO_API_KEY) {
  console.error('ERRO: A variável LEONARDO_API_KEY não está definida no seu arquivo .env');
  process.exit(1);
}

const headers = {
  'Authorization': `Bearer ${LEONARDO_API_KEY}`,
  'accept': 'application/json',
};

async function findMyInfoAndModels() {
  try {
    console.log("Buscando TODAS as suas informações no endpoint 'GET /me'...");
    const response = await axios.get(`${API_URL}/me`, { headers });
    const data = response.data;

    console.log('\n--- RESPOSTA COMPLETA DA API ---');
    console.log(JSON.stringify(data, null, 2));
    console.log('--- FIM DA RESPOSTA DA API ---\n');

    const userDetails = data.user_details && data.user_details[0];
    const elements = userDetails?.loras;

    if (elements && elements.length > 0) {
      console.log('✅ SUCESSO! Seus Elements (LoRAs) foram encontrados:');
      elements.forEach(element => {
        console.log(`  > Nome: ${element.name}`);
        console.log(`    ID (akUUID): ${element.akUUID}`); // O ID que você precisa!
        console.log('    --------------------');
      });
    } else {
      console.log('❌ IMPORTANTE: Nenhum Element (LoRA) encontrado na resposta de /me.');
      console.log('Verifique no site em "Your Elements" se o modelo treinado aparece lá.');
    }

  } catch (error) {
    const errorMessage = error.response?.data?.error || error.message;
    console.error('\nERRO AO BUSCAR INFORMAÇÕES:', errorMessage);
  }
}

findMyInfoAndModels();