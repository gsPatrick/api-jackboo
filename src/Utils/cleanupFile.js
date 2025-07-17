// src/Utils/cleanupFile.js
const fs = require('fs');
const { promisify } = require('util');

const unlinkAsync = promisify(fs.unlink);

/**
 * Deleta um arquivo de forma assíncrona.
 * @param {string} filePath - O caminho completo para o arquivo a ser deletado.
 */
async function cleanupFile(filePath) {
  if (!filePath) {
    return;
  }
  try {
    await unlinkAsync(filePath);
    console.log(`Arquivo temporário deletado: ${filePath}`);
  } catch (error) {
    console.error(`Erro ao deletar arquivo temporário ${filePath}:`, error);
  }
}

module.exports = cleanupFile;