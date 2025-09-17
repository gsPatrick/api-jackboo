// src/OpenAI/services/gemini.service.js

const axios = require('axios');
const fs = require('fs/promises');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const AI_GENERATED_DIR = path.join(__dirname, '../../../uploads/ai-generated');
const AI_GENERATED_URL_PREFIX = '/uploads/ai-generated';

class GeminiService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.modelName = 'gemini-1.5-flash';
    this.apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent`;

    if (!this.apiKey) {
      throw new Error('ERRO CRÍTICO: A variável de ambiente GEMINI_API_KEY não está configurada.');
    }
  }

  async generateImage({ textPrompt, baseImages = [] }) {
    if (!textPrompt || typeof textPrompt !== 'string') {
      throw new Error('[GeminiService] O prompt de texto é obrigatório e deve ser uma string.');
    }

    try {
      // ✅ CORREÇÃO CRÍTICA: A ordem das partes foi alterada.
      const parts = [];

      // 1. Adiciona o prompt de texto PRIMEIRO.
      parts.push({ text: textPrompt });

      // 2. Adiciona todas as imagens de base DEPOIS do texto.
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

      const payload = {
        contents: [{ parts }],
        safety_settings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
        ],
      };

      console.log(`[GeminiService] Enviando requisição para o modelo ${this.modelName} com ${baseImages.length} imagens de referência.`);

      const response = await axios.post(`${this.apiUrl}?key=${this.apiKey}`, payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      const candidates = response.data.candidates;
      if (!candidates || candidates.length === 0) {
        if (response.data.promptFeedback?.blockReason) {
          const reason = response.data.promptFeedback.blockReason;
          console.error(`[GeminiService] A geração foi bloqueada pela API por motivo de segurança: ${reason}`);
          throw new Error(`O conteúdo foi bloqueado por segurança: ${reason}`);
        }
        throw new Error('[GeminiService] A API do Gemini não retornou nenhum candidato válido.');
      }

      const imagePart = candidates[0].content.parts.find(part => part.inline_data);

      if (!imagePart || !imagePart.inline_data.data) {
        console.error('[GeminiService] Resposta da API não continha dados de imagem. Resposta recebida:', JSON.stringify(response.data, null, 2));
        throw new Error('[GeminiService] A API do Gemini não retornou os dados da imagem na resposta.');
      }

      const base64Data = imagePart.inline_data.data;

      return this.saveBase64Image(base64Data);

    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message;
      console.error(`[GeminiService] Erro ao gerar imagem: ${errorMessage}`);
      throw new Error(`Falha na comunicação com a API do Gemini: ${errorMessage}`);
    }
  }

  async saveBase64Image(base64Data) {
    try {
      await fs.mkdir(AI_GENERATED_DIR, { recursive: true });

      const filename = `${uuidv4()}.png`;
      const filePath = path.join(AI_GENERATED_DIR, filename);

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