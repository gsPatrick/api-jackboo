// src/Utils/TextToImageService.js
const sharp = require('sharp');
const path = require('path');
const fs = require('fs/promises'); // Usando fs/promises
const { v4: uuidv4 } = require('uuid');

const TEXT_IMAGE_DIR = path.join(__dirname, '../../uploads/text-images');

class TextToImageService {
  /**
   * Gera uma imagem a partir de um texto.
   * @param {object} options
   * @param {string} options.text - O texto a ser renderizado.
   * @param {string} [options.backgroundColor='#FFFFFF'] - Cor de fundo da imagem.
   * @param {string} [options.textColor='#000000'] - Cor do texto.
   * @param {number} [options.width=1024] - Largura da imagem em pixels.
   * @param {number} [options.height=1024] - Altura da imagem em pixels.
   * @param {string} [options.font='Arial'] - Fonte do texto.
   * @returns {string} O caminho relativo da imagem salva.
   */
  static async generateImage({
    text,
    backgroundColor = '#FFFFFF',
    textColor = '#000000',
    width = 1024,
    height = 1024,
    font = 'Arial'
  }) {
    try {
      await fs.mkdir(TEXT_IMAGE_DIR, { recursive: true });

      // Dividir o texto em linhas para caber na imagem
      const words = text.split(' ');
      const lines = [];
      let currentLine = words[0];
      const maxLineWidth = width * 0.8; // 80% da largura da imagem

      // Lógica simples de quebra de linha (pode ser melhorada com medição de texto real)
      for (let i = 1; i < words.length; i++) {
        // Esta é uma estimativa. Bibliotecas mais avançadas podem medir o texto.
        if (currentLine.length + words[i].length < 40) { // Limite de caracteres por linha
          currentLine += ` ${words[i]}`;
        } else {
          lines.push(currentLine);
          currentLine = words[i];
        }
      }
      lines.push(currentLine);

      const fontSize = 60;
      const lineHeight = fontSize * 1.2;
      const totalTextHeight = lines.length * lineHeight;
      const startY = (height - totalTextHeight) / 2 + fontSize; // Centraliza verticalmente

      const svgTextElements = lines.map((line, index) =>
        `<text x="${width / 2}" y="${startY + index * lineHeight}" font-family="${font}" font-size="${fontSize}" fill="${textColor}" text-anchor="middle">${line}</text>`
      ).join('');

      const svgImage = `
        <svg width="${width}" height="${height}">
          <rect x="0" y="0" width="${width}" height="${height}" fill="${backgroundColor}"></rect>
          ${svgTextElements}
        </svg>
      `;

      const filename = `${uuidv4()}.png`;
      const filePath = path.join(TEXT_IMAGE_DIR, filename);

      await sharp(Buffer.from(svgImage)).png().toFile(filePath);

      console.log(`[TextToImage] Imagem de texto salva em: ${filePath}`);
      return `/uploads/text-images/${filename}`;
    } catch (error) {
      console.error('[TextToImage] Erro ao gerar imagem de texto:', error);
      throw new Error('Falha ao gerar página de texto.');
    }
  }
}

module.exports = TextToImageService;    