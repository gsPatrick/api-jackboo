// src/OpenAI/services/openai.service.js

const OpenAI = require('openai');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const prompts = require('../config/AIPrompts');
const translationService = require('./translation.service');

class VisionService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não está configurada.');
    }
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Descreve uma imagem usando a descrição do usuário, com tradução para inglês.
   */
  async describeImage(imageUrl, userCharacterDescription) {
    if (!userCharacterDescription) {
      throw new Error('[VisionService] A descrição do usuário é obrigatória.');
    }

    const MAX_RETRIES = 3;
    const RETRY_DELAY = 2000;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[VisionService] Tentativa ${attempt}/${MAX_RETRIES} para descrever a imagem: ${imageUrl}`);
        
        const translatedDescription = await translationService.translateToEnglish(userCharacterDescription);
        const systemPrompt = prompts.CHARACTER_SYSTEM_PROMPT.replace('[USER_DESCRIPTION]', translatedDescription);

        const messages = [{
          role: "user",
          content: [{ type: "text", text: systemPrompt }, { type: "image_url", image_url: { url: imageUrl } }],
        }];

        const response = await this.openai.chat.completions.create({
          model: "gpt-4o",
          messages: messages,
          max_tokens: 350,
        });

        const descriptionInEnglish = response.choices[0].message.content.trim();
        console.log("[VisionService] Descrição detalhada (em inglês) recebida com sucesso:", descriptionInEnglish);

        return this.sanitizePromptForSafety(descriptionInEnglish);

      } catch (error) {
        const errorMessage = error.response ? error.response.data : error.message;
        console.error(`[VisionService] Tentativa ${attempt} falhou:`, errorMessage);
        if (attempt === MAX_RETRIES) {
          throw new Error(`Falha na análise da imagem após ${MAX_RETRIES} tentativas: ${error.response?.data?.error?.message || error.message}`);
        }
        await sleep(RETRY_DELAY);
      }
    }
  }
  
  /**
   * Gera uma descrição de contorno (sem cor) de um personagem.
   */
  async generateCharacterLineArtDescription(character) {
      try {
          let systemPrompt = prompts.CHARACTER_LINE_ART_DESCRIPTION_PROMPT;
          
          const translatedDescription = await translationService.translateToEnglish(character.description);

          systemPrompt = systemPrompt
              .replace(/\[CHARACTER_NAME\]/g, character.name)
              .replace(/\[CHARACTER_DESCRIPTION\]/g, translatedDescription);

          const response = await this.openai.chat.completions.create({
              model: "gpt-4o",
              messages: [{ role: "system", content: "You are a helpful assistant." }, { role: "user", content: systemPrompt }],
              max_tokens: 150,
          });
          
          return response.choices[0].message.content.trim();
      } catch (error) {
          console.error(`[VisionService] Erro ao gerar descrição de contorno para ${character.name}:`, error.message);
          // Em caso de falha, retorna uma descrição genérica segura
          return `a cartoon character with big eyes and a friendly smile`;
      }
  }

  /**
   * Gera o roteiro de um livro de HISTÓRIA ILUSTRADO, garantindo o protagonista.
   */
  async generateStoryBookStoryline(characters, theme, summary, sceneCount) {
    try {
      let systemPrompt = prompts.STORY_BOOK_STORYLINE_SYSTEM_PROMPT;
      
      const mainCharacter = characters[0];
      const translatedTheme = await translationService.translateToEnglish(theme);
      const translatedSummary = await translationService.translateToEnglish(summary);
      const translatedProtagonistDescription = await translationService.translateToEnglish(mainCharacter.description);

      console.log(`[VisionService] Gerando roteiro de história (em inglês). Personagem: ${mainCharacter.name}`);

      systemPrompt = systemPrompt
        .replace(/\[PROTAGONIST_NAME\]/g, mainCharacter.name)
        .replace(/\[PROTAGONIST_DESCRIPTION\]/g, translatedProtagonistDescription)
        .replace(/\[THEME\]/g, translatedTheme)
        .replace(/\[SUMMARY\]/g, translatedSummary)
        .replace(/\[SCENE_COUNT\]/g, sceneCount.toString());
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `Generate the story in ${sceneCount} scenes.` }],
        max_tokens: 400 * sceneCount,
      });

      let resultText = response.choices[0].message.content;
        
      const result = JSON.parse(resultText);

      if (!result.story_pages || !Array.isArray(result.story_pages)) {
          throw new Error('A IA não retornou "story_pages" como um array de objetos.');
      }
      
      return result.story_pages.map(page => {
          const finalIllustrationPrompt = `${mainCharacter.name}, a ${translatedProtagonistDescription}, ${page.illustration_prompt}`;
          return { 
              ...page, 
              illustration_prompt: this.sanitizePromptForSafety(finalIllustrationPrompt) 
          };
      });
    } catch (error) {
      console.error(`[VisionService] Erro ao gerar o roteiro do livro de história: ${error.message}`);
      throw new Error(`Falha na geração do roteiro da história: ${error.message}`);
    }
  }

  /**
   * Gera o roteiro de um livro de COLORIR, garantindo o protagonista e a ausência de cores.
   */
  async generateColoringBookStoryline(characters, theme, pageCount) {
    try {
      let systemPrompt = prompts.COLORING_BOOK_STORYLINE_SYSTEM_PROMPT;
      
      const mainCharacter = characters[0];
      const translatedTheme = await translationService.translateToEnglish(theme);
      
      // Gera a descrição de contorno, sem cor, para o miolo
      const lineArtDescription = await this.generateCharacterLineArtDescription(mainCharacter);

      console.log(`[VisionService] Gerando roteiro de colorir (em inglês). Personagem: ${mainCharacter.name}, Tema: ${theme}`);

      systemPrompt = systemPrompt
        .replace(/\[PROTAGONIST_NAME\]/g, mainCharacter.name)
        .replace(/\[PROTAGONIST_DESCRIPTION\]/g, lineArtDescription)
        .replace(/\[THEME\]/g, translatedTheme)
        .replace(/\[PAGE_COUNT\]/g, pageCount.toString());

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Create the story in ${pageCount} scenes for the theme "${translatedTheme}".` }
        ],
        max_tokens: 200 * pageCount,
      });
      
      const result = JSON.parse(response.choices[0].message.content);
      if (!result.pages || !Array.isArray(result.pages)) throw new Error('A IA não retornou "pages" como um array.');
      
      // Injeta a descrição de contorno em cada prompt de cena
      return result.pages.map(sceneDescription => {
          const finalPrompt = `${mainCharacter.name}, ${lineArtDescription}, ${sceneDescription}`;
          return this.sanitizePromptForSafety(finalPrompt);
      });
    } catch (error) {
      console.error(`[VisionService] Erro ao gerar o roteiro do livro de colorir: ${error.message}`);
      throw new Error(`Falha na geração do roteiro: ${error.message}`);
    }
  }

  /**
   * Gera uma descrição textual para a CAPA/CONTRACAPA, garantindo o protagonista.
   */
  async generateCoverDescription(bookTitle, bookGenre, characters) {
    try {
      let systemPrompt = prompts.BOOK_COVER_SYSTEM_PROMPT;

      const mainCharacter = characters[0];
      const translatedTitle = await translationService.translateToEnglish(bookTitle);
      const translatedGenre = await translationService.translateToEnglish(bookGenre);
      const translatedProtagonistDescription = await translationService.translateToEnglish(mainCharacter.description);
      const characterNames = characters.map(c => c.name).join(' and ');
      
      console.log(`[VisionService] Gerando descrição para capa (em inglês). Título: "${bookTitle}", Gênero: "${bookGenre}", Personagens: ${characterNames}`);

      systemPrompt = systemPrompt
        .replace(/\[PROTAGONIST_NAME\]/g, mainCharacter.name)
        .replace(/\[PROTAGONIST_DESCRIPTION\]/g, translatedProtagonistDescription)
        .replace(/\[BOOK_TITLE\]/g, translatedTitle || '')
        .replace(/\[BOOK_GENRE\]/g, translatedGenre || '')
        .replace(/\[CHARACTER_NAMES\]/g, characterNames || '');

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Create a detailed and captivating description for the book cover of "${translatedTitle}".` }
        ],
        max_tokens: 250,
      });

      const description = response.choices[0].message.content.trim();
      console.log("[VisionService] Descrição da capa (em inglês) recebida:", description);
      
      return this.sanitizePromptForSafety(description);

    } catch (error) {
      console.error('[VisionService] Erro ao gerar descrição da capa:', error.message);
      throw new Error(`Falha na geração da capa: ${error.message}`);
    }
  }

  /**
   * Substitui palavras problemáticas por alternativas seguras.
   */
  sanitizePromptForSafety(prompt) {
    if (!prompt) return '';
    let sanitizedPrompt = prompt;

    const forbiddenMap = {
      'child': 'young character', 'children': 'young characters', 'kid': 'youngster', 'kids': 'youngsters',
      'boy': 'young male character', 'girl': 'young female character', 'baby': 'toddler', 'infant': 'toddler',
      'shooting': 'streaking',
      'nudges': 'gently pushes',
      'shot': 'picture'
    };

    for (const [key, value] of Object.entries(forbiddenMap)) {
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        sanitizedPrompt = sanitizedPrompt.replace(regex, value);
    }
    
    const dangerousWords = ['sexy', 'nude', 'violence', 'blood', 'gun', 'kill'];
    const dangerousRegex = new RegExp('\\b(' + dangerousWords.join('|') + ')\\b', 'gi');
    sanitizedPrompt = sanitizedPrompt.replace(dangerousRegex, 'happy scene');

    return sanitizedPrompt;
  }
}

module.exports = new VisionService();