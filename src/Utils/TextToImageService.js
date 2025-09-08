// src/Utils/TextToImageService.js
const sharp = require('sharp');
const path = require('path');
const fs = require('fs/promises');
const { v4: uuidv4 } = require('uuid');

const TEXT_IMAGE_DIR = path.join(__dirname, '../../uploads/text-images');

class TextToImageService {
  /**
   * Gera uma imagem PNG a partir de um bloco de texto.
   * @param {object} options
   * @param {string} options.text - O texto a ser renderizado na imagem.
   * @param {number} [options.width=1024] - Largura da imagem.
   * @param {number} [options.height=1024] - Altura da imagem.
   * @returns {string} O caminho relativo da imagem salva (ex: /uploads/text-images/...).
   */
  static async generateImage({ text, width = 1024, height = 1024 }) {
    try {
      await fs.mkdir(TEXT_IMAGE_DIR, { recursive: true });

      // Configurações de estilo para o texto
      const fontFamily = 'Mali, cursive'; // Uma fonte amigável e legível
      const fontSize = 48;
      const textColor = '#2F4A6E'; // Azul escuro
      const backgroundColor = '#FEF8F0'; // Bege ultra claro
      const lineHeight = 1.4;
      const padding = 80; // Espaço das bordas

      // Quebra o texto em palavras para calcular as linhas
      const words = text.split(' ');
      let line = '';
      const lines = [];
      const maxWidth = width - (padding * 2);

      // Lógica de quebra de linha usando uma estimativa de largura de caractere
      // Para precisão máxima, uma biblioteca como 'canvas' seria necessária, mas 'sharp' com SVG é mais leve.
      for (const word of words) {
        const testLine = line + (line ? ' ' : '') + word;
        // Estimativa: cada caractere tem em média 0.6 * fontSize de largura
        if (testLine.length * (fontSize * 0.55) > maxWidth) {
          lines.push(line);
          line = word;
        } else {
          line = testLine;
        }
      }
      lines.push(line);

      // Constrói os elementos <tspan> para o SVG, permitindo o alinhamento central de cada linha.
      const svgTextElements = lines.map((lineText, index) => 
        `<tspan x="50%" dy="${index === 0 ? 0 : fontSize * lineHeight}">${lineText}</tspan>`
      ).join('');
      
      const totalTextHeight = lines.length * (fontSize * lineHeight);
      const startY = (height - totalTextHeight) / 2 + (fontSize * 0.8); // Ajuste fino para centralização vertical

      const svgImage = `
        <svg width="${width}" height="${height}">
          <rect x="0" y="0" width="${width}" height="${height}" fill="${backgroundColor}"></rect>
          <text 
            x="50%" 
            y="${startY}" 
            font-family="${fontFamily}" 
            font-size="${fontSize}" 
            fill="${textColor}" 
            text-anchor="middle"
            style="line-height: ${lineHeight};"
          >
            ${svgTextElements}
          </text>
        </svg>
      `;

      const filename = `${uuidv4()}.png`;
      const filePath = path.join(TEXT_IMAGE_DIR, filename);

      await sharp(Buffer.from(svgImage)).png().toFile(filePath);

      console.log(`[TextToImage] Imagem de texto para a página gerada com sucesso: ${filename}`);
      return `/uploads/text-images/${filename}`;

    } catch (error) {
      console.error('[TextToImage] Erro ao gerar imagem de texto:', error);
      throw new Error('Falha ao gerar a página de texto como imagem.');
    }
  }
}

module.exports = TextToImageService;