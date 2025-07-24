// getLeonardoUserId.js

const axios = require('axios');
require('dotenv').config(); // Para carregar a chave da API do seu arquivo .env

/**
 * Script para buscar e exibir seu User ID da API do Leonardo.AI.
 */
async function getMyUserId() {
  const apiKey = '2693b851-8dc6-49cb-8f47-dc42f61d314e';
  const apiUrl = 'https://cloud.leonardo.ai/api/rest/v1/me';

  if (!apiKey) {
    console.error('ERRO: A variável de ambiente LEONARDO_API_KEY não foi encontrada.');
    console.error('Verifique se seu arquivo .env está na raiz do projeto e contém a chave correta.');
    return;
  }

  console.log('Buscando informações do usuário...');

  try {
    const response = await axios.get(apiUrl, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'accept': 'application/json'
      }
    });

    const data = response.data;

    // A resposta da API do Leonardo é um pouco aninhada.
    const userDetails = data?.user_details?.[0];

    if (userDetails && userDetails.id) {
      console.log('\n✅ SUCESSO! Informações encontradas.\n');
      console.log('==================================================================');
      console.log('Seu User ID do Leonardo.AI é:');
      console.log(userDetails.id);
      console.log('==================================================================');
      console.log('\nCopie este ID e cole no arquivo "LeonardoAdmin.service.js".\n');
    } else {
      console.error('ERRO: A resposta da API não continha o User ID no formato esperado.');
      // Linha de depuração: Descomente para ver a resposta completa da API
      // console.log('Resposta completa recebida:', JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error('\n❌ FALHA AO BUSCAR INFORMAÇÕES ❌\n');
    if (error.response) {
      console.error(`Status: ${error.response.status} - ${error.response.statusText}`);
      console.error('Detalhes:', error.response.data);
      if (error.response.status === 401) {
        console.error('\nO erro 401 (Unauthorized) geralmente significa que sua LEONARDO_API_KEY é inválida ou expirou.');
      }
    } else {
      console.error('Ocorreu um erro na requisição:', error.message);
    }
  }
}

getMyUserId();