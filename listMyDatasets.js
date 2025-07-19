// listMyDatasets.js
require('dotenv').config();
const axios = require('axios');

const API_URL = 'https://cloud.leonardo.ai/api/rest/v1';

if (!LEONARDO_API_KEY) throw new Error('LEONARDO_API_KEY não está no .env');

const headers = {
  'Authorization': `Bearer ${LEONARDO_API_KEY}`,
  'accept': 'application/json',
};

async function listDatasets() {
  try {
    console.log("Buscando a lista de todos os seus datasets...");
    // A API não tem um endpoint para listar todos os datasets.
    // MAS podemos tentar adivinhar a estrutura da resposta /me
    // ou simplesmente pegar o ID da URL no site.
    
    // --- MÉTODO MAIS FÁCIL ---
    console.log("\n--- MÉTODO FÁCIL: PEGUE O ID DA URL ---");
    console.log("1. Vá para a página 'Training & Datasets' no site do Leonardo.AI.");
    console.log("2. Clique no seu dataset 'Jackboo API Dataset'.");
    console.log("3. A URL no seu navegador será algo como: https://app.leonardo.ai/datasets/XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX");
    console.log("4. O conjunto de letras e números no final da URL é o ID do seu dataset. Copie-o!");
    console.log("------------------------------------------");
    
  } catch (error) {
    const errorMessage = error.response?.data?.error || error.message;
    console.error('\nERRO AO BUSCAR INFORMAÇÕES:', errorMessage);
  }
}

listDatasets();