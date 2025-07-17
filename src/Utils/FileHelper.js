// src/Utils/fileHelper.js
const fs = require('fs/promises');
const path = require('path');

const UPLOADS_ROOT_DIR = path.join(__dirname, '../../');

/**
 * Deleta um arquivo físico do servidor de forma segura.
 * @param {string} relativeUrl - A URL relativa do arquivo (ex: "/uploads/user-drawings/imagem.png").
 */
async function deleteFile(relativeUrl) {
  if (!relativeUrl || !relativeUrl.startsWith('/uploads/')) {
    // Não tenta deletar arquivos fora da pasta de uploads
    return;
  }

  try {
    const filePath = path.join(UPLOADS_ROOT_DIR, relativeUrl);
    await fs.unlink(filePath);
    console.log(`[FileHelper] Arquivo deletado com sucesso: ${filePath}`);
  } catch (error) {
    // Ignora o erro se o arquivo não existir (ENOENT), pois o objetivo (deletar) foi alcançado.
    if (error.code !== 'ENOENT') {
      console.error(`[FileHelper] Erro ao deletar o arquivo ${relativeUrl}:`, error);
    }
  }
}

module.exports = { deleteFile };