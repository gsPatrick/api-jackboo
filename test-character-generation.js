// test-character-generation.js

require('dotenv').config();
const path = require('path');
const { generateCharacter } = require('./src/Generators/characterGenerator');
const { sequelize } = require('./src/models');

// --- CONFIGURAÇÕES DO TESTE ---
// Certifique-se de que um usuário com este ID existe no seu banco de dados.
const USER_ID_FOR_TEST = 1; 
// Coloque aqui o nome exato do seu arquivo de imagem de teste.
const TEST_IMAGE_FILENAME = 'meu-desenho.png'; 
// -----------------------------

/**
 * Função principal assíncrona para rodar o teste.
 */
async function runTest() {
  console.log('Iniciando script de teste de geração de personagem com Replicate...');

  try {
    // 1. Conectar ao banco de dados para garantir que está funcionando.
    await sequelize.authenticate();
    console.log('Conexão com o banco de dados estabelecida.');

    // 2. Simular o objeto 'file' que o middleware Multer criaria após um upload.
    // O `characterGenerator` espera um objeto com esta estrutura.
    const simulatedFileObject = {
      // O nome do arquivo que será salvo na pasta 'user-drawings'.
      // O `originalDrawingUrl` será construído a partir disso.
      filename: `test-${Date.now()}-${TEST_IMAGE_FILENAME}`,
      
      // O caminho completo para o arquivo no sistema.
      // Embora nosso novo gerador não leia mais o arquivo daqui, é bom manter a estrutura.
      path: path.join(__dirname, 'uploads', 'user-drawings', `test-${Date.now()}-${TEST_IMAGE_FILENAME}`),
      
      // O nome original do arquivo.
      originalname: TEST_IMAGE_FILENAME
    };

    // 3. Chamar a função principal que queremos testar.
    console.log('\nChamando a função generateCharacter...');
    console.log('Aguarde, o processo com Replicate pode levar de 15 a 30 segundos...');
    const character = await generateCharacter(USER_ID_FOR_TEST, simulatedFileObject);

    // 4. Exibir o resultado no console.
    console.log('\n--- GERAÇÃO CONCLUÍDA! ---');
    console.log('Personagem criado e imagem gerada com sucesso.');
    console.log('Objeto do personagem salvo no banco:');
    console.log(JSON.stringify(character, null, 2));
    console.log(`\nURL da imagem original: ${process.env.SERVER_BASE_URL}${character.originalDrawingUrl}`);
    console.log(`URL da imagem gerada pelo Replicate: ${character.generatedCharacterUrl}`);

  } catch (error) {
    console.error('\n--- OCORREU UM ERRO DURANTE O TESTE ---');
    console.error(error);
    process.exit(1); // Termina o script com um código de erro.
  } finally {
    // 5. Fechar a conexão com o banco de dados para o script terminar corretamente.
    await sequelize.close();
    console.log('\nConexão com o banco de dados fechada. Script finalizado.');
  }
}

// Executa a função de teste.
runTest();