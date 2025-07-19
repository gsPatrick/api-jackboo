// test-character-generation.js (Versão Final e Correta)

require('dotenv').config();
const path = require('path');
const { generateCharacter } = require('./src/Generators/characterGenerator');
const { sequelize } = require('./src/models');

// --- CONFIGURAÇÕES DO TESTE ---
const USER_ID_FOR_TEST = 1; 
const TEST_IMAGE_FILENAME = 'meu-desenho.png'; // O nome do seu arquivo de teste que está em /public/images
// -----------------------------

/**
 * Função principal assíncrona para rodar o teste.
 */
async function runTest() {
  console.log('Iniciando script de teste de geração de personagem com Replicate...');

  try {
    // 1. Conectar ao banco de dados.
    await sequelize.authenticate();
    console.log('Conexão com o banco de dados estabelecida.');

    // 2. Simular o objeto 'file' que o Multer criaria.
    // Não copiamos mais arquivos, apenas montamos o objeto que a função precisa.
    const simulatedFileObject = {
      filename: TEST_IMAGE_FILENAME, 
      path: path.join(__dirname, 'public', 'images', TEST_IMAGE_FILENAME), // Caminho teórico
      originalname: TEST_IMAGE_FILENAME
    };

    // 3. Chamar a função principal que queremos testar.
    console.log('\nChamando a função generateCharacter...');
    console.log('Aguarde, o processo com Replicate pode levar de 15 a 30 segundos...');
    const character = await generateCharacter(USER_ID_FOR_TEST, simulatedFileObject);

    // 4. Exibir o resultado.
    console.log('\n--- GERAÇÃO CONCLUÍDA! ---');
    console.log('Processo finalizado.');
    
    if (character && character.generatedCharacterUrl) {
      console.log('Personagem criado e imagem gerada com sucesso.');
      console.log(JSON.stringify(character.toJSON(), null, 2));
      console.log(`\nURL da imagem original (referência): ${getPublicUrl(`/images/${TEST_IMAGE_FILENAME}`)}`);
      console.log(`URL da imagem gerada pelo Replicate: ${character.generatedCharacterUrl}`);
    } else {
      console.error('A geração da imagem falhou. Verifique os logs de erro acima.');
      console.log('Dados do personagem salvo (sem imagem gerada):');
      console.log(JSON.stringify(character.toJSON(), null, 2));
    }

  } catch (error) {
    console.error('\n--- OCORREU UM ERRO DURANTE O TESTE ---');
    console.error(error);
    process.exit(1);
  } finally {
    // 5. Fechar a conexão com o banco de dados.
    await sequelize.close();
    console.log('\nConexão com o banco de dados fechada. Script finalizado.');
  }
}

// Função auxiliar para montar a URL pública para o log final
function getPublicUrl(localUrl) {
    const cleanLocalUrl = localUrl.startsWith('/') ? localUrl.substring(1) : localUrl;
    return `${process.env.SERVER_BASE_URL}/${cleanLocalUrl}`;
}

// Executa a função de teste.
runTest();