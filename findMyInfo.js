// findMyInfo.js
require('dotenv').config();
const axios = require('axios');

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

    // --- AQUI ESTÁ A CHAVE ---
    // Imprimimos o objeto de resposta completo e formatado.
    // Assim podemos ver exatamente onde os seus Elements estão localizados.
    console.log('\n--- RESPOSTA COMPLETA DA API ---');
    console.log(JSON.stringify(data, null, 2));
    console.log('--- FIM DA RESPOSTA DA API ---\n');

    // Agora, procuramos pela lista de Elements na resposta
    const userDetails = data.user_details && data.user_details[0];
    // A API pode retornar a lista como 'loras' ou 'elements'. Vamos checar.
    const elements = userDetails?.loras || userDetails?.elements;

    if (elements && elements.length > 0) {
      console.log('✅ SUCESSO! Seus Elements foram encontrados dentro da resposta de /me:');
      elements.forEach(element => {
        console.log(`  > Nome: ${element.name}`);
        console.log(`    ID (akUUID): ${element.akUUID}`); // O ID que precisamos!
        console.log('    --------------------');
      });
    } else {
      console.log('❌ IMPORTANTE: Nenhum Element (LoRA) encontrado na resposta de /me.');
      console.log('Por favor, verifique o JSON completo impresso acima para encontrar a lista de modelos sob uma chave diferente (ex: "custom_models").');
    }

  } catch (error) {
    const errorMessage = error.response?.data?.error || error.message;
    console.error('\nERRO AO BUSCAR INFORMAÇÕES:', errorMessage);
  }
}

findMyInfoAndModels();