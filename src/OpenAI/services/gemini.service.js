// src/OpenAI/services/gemini.service.js

const axios = require('axios');
const fs = require('fs/promises');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Diretório onde as imagens geradas pela IA serão salvas.
const AI_GENERATED_DIR = path.join(__dirname, '../../../uploads/ai-generated');
const AI_GENERATED_URL_PREFIX = '/uploads/ai-generated';

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.modelName = 'gemini-1.5-flash'; // Usando o modelo mais recente e eficiente
    this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent`;

    if (!this.apiKey) {
      throw new Error('ERRO CRÍTICO: A variável de ambiente GEMINI_API_KEY não está configurada.');
    }
  }

  /**
   * Gera uma imagem usando a API do Gemini a partir de um prompt de texto e imagens de referência.
   * A API do Gemini é síncrona e retorna os dados da imagem em base64.
   * @param {object} options
   * @param {string} options.textPrompt - O prompt de texto detalhado para a geração.
   * @param {Array<object>} [options.baseImages=[]] - Um array de objetos de imagem para referência.
   * @param {Buffer} options.baseImages[].imageData - Os dados da imagem como um Buffer.
   * @param {string} options.baseImages[].mimeType - O tipo MIME da imagem (ex: 'image/png', 'image/jpeg').
   * @returns {Promise<string>} O caminho relativo da imagem salva (ex: '/uploads/ai-generated/nome-do-arquivo.png').
   */
  async generateImage({ textPrompt, baseImages = [] }) {
    if (!textPrompt || typeof textPrompt !== 'string') {
      throw new Error('[GeminiService] O prompt de texto é obrigatório e deve ser uma string.');
    }

    try {
      // 1. Constrói as "partes" da requisição multimodal
      const parts = [];

      // Adiciona todas as imagens de base (estilo, personagem, etc.)
      for (const image of baseImages) {
        if (!image.imageData || !image.mimeType) {
          console.warn('[GeminiService] Item de imagem inválido ignorado:', image);
          continue;
        }
        parts.push({
          inline_data: {
            mime_type: image.mimeType,
            data: image.imageData.toString('base64'),
          },
        });
      }

      // Adiciona o prompt de texto
      parts.push({ text: textPrompt });

      const payload = {
        contents: [{ parts }],
        // Adicionar configurações de segurança pode ser uma boa prática
        safety_settings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      };

      console.log(`[GeminiService] Enviando requisição para o modelo ${this.modelName} com ${baseImages.length} imagens de referência.`);

      // 2. Faz a chamada para a API do Gemini
      const response = await axios.post(`${this.apiUrl}?key=${this.apiKey}`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      // 3. Extrai os dados da imagem da resposta
      const candidates = response.data.candidates;
      if (!candidates || candidates.length === 0) {
        // Verifica se a API bloqueou a resposta por segurança
        if (response.data.promptFeedback?.blockReason) {
          const reason = response.data.promptFeedback.blockReason;
          console.error(`[GeminiService] A geração foi bloqueada pela API por motivo de segurança: ${reason}`);
          throw new Error(`O conteúdo foi bloqueado por segurança: ${reason}`);
        }
        throw new Error('[GeminiService] A API do Gemini não retornou nenhum candidato válido.');
      }

      // Encontra a primeira "parte" que contém dados de imagem
      const imagePart = candidates[0].content.parts.find(part => part.inline_data);

      if (!imagePart || !imagePart.inline_data.data) {
        console.error('[GeminiService] Resposta da API não continha dados de imagem. Resposta recebida:', JSON.stringify(response.data, null, 2));
        throw new Error('[GeminiService] A API do Gemini não retornou os dados da imagem na resposta.');
      }

      const base64Data = imagePart.inline_data.data;

      // 4. Decodifica e salva a imagem localmente
      return this.saveBase64Image(base64Data);

    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      console.error(`[GeminiService] Erro ao gerar imagem: ${errorMessage}`);
      throw new Error(`Falha na comunicação com a API do Gemini: ${errorMessage}`);
    }
  }

  /**
   * Salva uma string base64 como um arquivo de imagem PNG.
   * @param {string} base64Data - A string de dados da imagem codificada em base64.
   * @returns {Promise<string>} O caminho relativo da imagem salva.
   */
  async saveBase64Image(base64Data) {
    try {
      // Garante que o diretório de destino exista
      await fs.mkdir(AI_GENERATED_DIR, { recursive: true });

      const filename = `${uuidv4()}.png`;
      const filePath = path.join(AI_GENERATED_DIR, filename);

      // Converte base64 para um buffer e salva o arquivo
      const imageBuffer = Buffer.from(base64Data, 'base64');
      await fs.writeFile(filePath, imageBuffer);

      const relativeUrl = `${AI_GENERATED_URL_PREFIX}/${filename}`;
      console.log(`[GeminiService] Imagem salva com sucesso em: ${relativeUrl}`);

      return relativeUrl;
    } catch (error) {
      console.error('[GeminiService] Erro ao salvar a imagem a partir de base64:', error);
      throw new Error('Falha ao salvar a imagem gerada localmente.');
    }
  }
}

module.exports = new GeminiService();