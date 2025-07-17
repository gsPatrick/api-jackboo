const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Define o diretório raiz de uploads
const UPLOADS_ROOT_DIR = path.join(__dirname, '../../../uploads');
const AI_GENERATED_SUBDIR = 'ai-generated'; // Subdiretório para imagens geradas pela IA

// Garante que o diretório de imagens geradas exista
const AI_GENERATED_FULL_PATH = path.join(UPLOADS_ROOT_DIR, AI_GENERATED_SUBDIR);
if (!fs.existsSync(AI_GENERATED_FULL_PATH)) {
  fs.mkdirSync(AI_GENERATED_FULL_PATH, { recursive: true });
}

/**
 * Baixa uma imagem de uma URL e a salva localmente no diretório de imagens geradas por IA.
 * @param {string} imageUrl - URL da imagem a ser baixada.
 * @returns {string} O caminho local (URL relativa) do arquivo salvo, ex: '/uploads/ai-generated/nome_do_arquivo.png'.
 */
async function downloadAndSaveImage(imageUrl) {
  try {
    const response = await axios({
      url: imageUrl,
      method: 'GET',
      responseType: 'stream',
    });

    const fileExtension = path.extname(new URL(imageUrl).pathname) || '.png';
    const filename = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(AI_GENERATED_FULL_PATH, filename);
    const writer = fs.createWriteStream(filePath);

    response.data.pipe(writer);

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(`/uploads/${AI_GENERATED_SUBDIR}/${filename}`));
      writer.on('error', reject);
    });
  } catch (error) {
    console.error(`Erro ao baixar imagem de ${imageUrl}:`, error.message);
    throw new Error('Falha ao baixar e salvar a imagem gerada pela IA.');
  }
}

module.exports = { downloadAndSaveImage };