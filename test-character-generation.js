// test-character-generation.js (Versão para Teste com Imgur)

require('dotenv').config();
const { generateCharacter } = require('./src/Generators/characterGenerator');
const { sequelize } = require('./src/models');

const USER_ID_FOR_TEST = 1;

async function runTest() {
  console.log('Iniciando teste com URLs do Imgur...');

  try {
    await sequelize.authenticate();
    console.log('Conexão com o banco de dados estabelecida.');

    // O objeto 'file' agora é só um placeholder.
    const simulatedFileObject = {
      filename: `test-from-imgur-${Date.now()}.png`,
    };

    console.log('\nChamando a função generateCharacter...');
    console.log('Aguarde, o processo com Replicate pode levar de 15 a 30 segundos...');
    const character = await generateCharacter(USER_ID_FOR_TEST, simulatedFileObject);

    console.log('\n--- GERAÇÃO CONCLUÍDA! ---');
    console.log('Processo finalizado.');
    
    if (character && character.generatedCharacterUrl) {
      console.log('Personagem criado e imagem gerada com sucesso.');
      console.log(JSON.stringify(character.toJSON(), null, 2));
      console.log(`\nURL da imagem gerada pelo Replicate (e salva localmente): ${character.generatedCharacterUrl}`);
    } else {
      console.error('A geração da imagem falhou. Verifique os logs de erro acima.');
    }

  } catch (error) {
    console.error('\n--- OCORREU UM ERRO DURANTE O TESTE ---');
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('\nConexão com o banco de dados fechada.');
  }
}

runTest();