// src/OpenAI/services/openai.service.js

const OpenAI = require('openai');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class VisionService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não está configurada.');
    }
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Descreve uma imagem usando um template de prompt dinâmico.
   */
  async describeImage(imageUrl, promptTemplate) {
    if (!promptTemplate) {
      throw new Error('[VisionService] O template de prompt para descrição da imagem não foi fornecido.');
    }

    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[VisionService] Tentativa ${attempt}/${MAX_RETRIES} para descrever a imagem: ${imageUrl}`);

        const messages = [{
          role: "user",
          content: [{
            type: "text",
            text: promptTemplate
          }, {
            type: "image_url",
            image_url: { url: imageUrl },
          }, ],
        }, ];

        const response = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages: messages,
          max_tokens: 150,
        });

        const description = response.choices[0].message.content.trim();
        console.log("[VisionService] Descrição detalhada recebida com sucesso:", description);

        return description;

      } catch (error) {
        const errorMessage = error.response ? error.response.data : error.message;
        console.error(`[VisionService] Tentativa ${attempt} falhou:`, errorMessage);

        if (attempt === MAX_RETRIES) {
          console.error('[VisionService] Todas as tentativas de chamar a API de visão falharam.');
          throw new Error(`Falha na análise da imagem após ${MAX_RETRIES} tentativas: ${error.response?.data?.error?.message || error.message}`);
        }

        await sleep(RETRY_DELAY);
      }
    }
  }

  /**
   * Gera o roteiro de um livro de colorir usando um template de prompt do sistema.
   */
  async generateColoringBookStoryline(characterName, characterDescription, theme, pageCount, systemPromptTemplate) {
    if (!systemPromptTemplate) {
        throw new Error('[VisionService] O template de prompt para gerar o roteiro do livro não foi fornecido.');
    }

    try {
      console.log(`[VisionService] Gerando roteiro NARRATIVO para livro de colorir. Personagem: ${characterName}, Tema: ${theme}, Páginas: ${pageCount}`);

      const systemPrompt = systemPromptTemplate
        .replace(/{{PAGE_COUNT}}/g, pageCount)
        .replace(/{{THEME}}/g, theme)
        .replace(/{{CHARACTER_NAME}}/g, characterName)
        .replace(/{{CHARACTER_DESCRIPTION}}/g, characterDescription);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [{
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `Create the complete visual story in ${pageCount} scenes for the theme "${theme}". Follow ALL directing rules.`
          }
        ],
        max_tokens: 350 * pageCount,
      });

      const result = JSON.parse(response.choices[0].message.content);

      if (!result.pages || !Array.isArray(result.pages) || result.pages.length === 0) {
        throw new Error('A IA não retornou a lista de páginas no formato esperado.');
      }

      console.log("[VisionService] Roteiro do livro de colorir recebido com sucesso.");
      const sanitizedPages = result.pages.map(prompt => this.sanitizePromptForSafety(prompt));
      return sanitizedPages;

    } catch (error) {
      console.error(`[VisionService] Erro ao gerar o roteiro do livro de colorir: ${error.message}`);
      throw new Error(`Falha na geração do roteiro: ${error.message}`);
    }
  }

  /**
   * Gera um tema e título para um livro usando um template de prompt do sistema.
   */
  async generateBookThemeAndTitle(characterDescription, systemPromptTemplate) {
    if (!systemPromptTemplate) {
        throw new Error('[VisionService] O template de prompt para gerar tema e título não foi fornecido.');
    }

    try {
      console.log(`[VisionService] Gerando TEMA e TÍTULO aleatórios para o livro...`);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [{
            role: "system",
            content: systemPromptTemplate
          },
          {
            role: "user",
            content: `Generate the theme and title for a character described as: "${characterDescription}"`
          }
        ],
        max_tokens: 100,
      });

      const result = JSON.parse(response.choices[0].message.content);
      if (!result.theme || !result.title) {
        throw new Error('A IA não retornou o tema e o título no formato JSON esperado.');
      }

      console.log(`[VisionService] Tema e Título gerados:`, result);
      return result;

    } catch (error) {
      console.error('[VisionService] Erro ao gerar tema e título do livro:', error.message);
      return {
        theme: 'A Fun Day of Adventures',
        title: 'The Magical Adventure Book'
      };
    }
  }

  /**
   * Gera o roteiro de um livro de HISTÓRIA ILUSTRADO, agora recebendo o resumo do usuário.
   * @param {string} summary - O resumo da história fornecido pelo usuário.
   * @returns {Promise<Array<{page_text: string, illustration_prompt: string}>>} Um array de objetos de página.
   */
  async generateStoryBookStoryline(characterName, characterDescription, theme, summary, sceneCount, systemPromptTemplate) {
    if (!systemPromptTemplate) {
        throw new Error('[VisionService] O template de prompt para gerar o roteiro do livro de história não foi fornecido.');
    }

    try {
      console.log(`[VisionService] Gerando roteiro de HISTÓRIA ILUSTRADA com base no resumo do usuário.`);

      const finalSystemPrompt = systemPromptTemplate
        .replace(/{{SCENE_COUNT}}/g, sceneCount)
        .replace(/{{THEME}}/g, theme)
        .replace(/{{CHARACTER_NAME}}/g, characterName)
        .replace(/{{CHARACTER_DESCRIPTION}}/g, characterDescription)
        .replace(/{{USER_SUMMARY}}/g, summary); // Injeta o resumo do usuário no template
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [{
            role: "system",
            content: finalSystemPrompt
          },
          {
            role: "user",
            content: `Generate a story with ${sceneCount} scenes based on the provided summary and theme. For each scene, provide the text and a detailed visual prompt for an illustration.`
          }
        ],
        max_tokens: 400 * sceneCount,
      });

      const result = JSON.parse(response.choices[0].message.content);

      if (!result.story_pages || !Array.isArray(result.story_pages) || result.story_pages.length === 0) {
        throw new Error('A IA não retornou o roteiro no formato JSON esperado (chave "story_pages").');
      }

      console.log("[VisionService] Roteiro do livro de história recebido com sucesso.");
      
      const sanitizedStoryPages = result.story_pages.map(page => ({
          ...page,
          illustration_prompt: this.sanitizePromptForSafety(page.illustration_prompt)
      }));

      return sanitizedStoryPages;

    } catch (error) {
      console.error(`[VisionService] Erro ao gerar o roteiro do livro de história: ${error.message}`);
      throw new Error(`Falha na geração do roteiro da história: ${error.message}`);
    }
  }


  /**
   * Remove palavras relacionadas a cores de uma descrição, para páginas de colorir.
   */
  sanitizeDescriptionForColoring(description) {
    if (!description) return '';
    const colorWords = [
      'amarela', 'amarelo', 'laranja', 'azul', 'azuis', 'marrom', 'verde',
      'vermelho', 'rosa', 'preto', 'branco', 'cinza', 'roxo', 'violeta',
      'dourado', 'prateado', 'colorido', 'colorida'
    ];
    const regex = new RegExp('\\b(' + colorWords.join('|') + ')\\b', 'gi');
    return description.replace(regex, '').replace(/\s\s+/g, ' ').trim();
  }

  /**
   * Remove palavras sensíveis de um prompt para evitar bloqueios da API de imagem.
   */
  sanitizePromptForSafety(prompt) {
    if (!prompt) return '';
    const forbiddenWords = [
      'criança', 'crianças', 'menino', 'menina', 'bebê', 'infantil', 'garoto', 'garota',
      'child', 'children', 'kid', 'kids', 'boy', 'girl', 'baby', 'infant', 'toddler'
    ];
    const regex = new RegExp('\\b(' + forbiddenWords.join('|') + ')\\b', 'gi');
    return prompt.replace(regex, 'friendly figures');
  }
}

module.exports = new VisionService();