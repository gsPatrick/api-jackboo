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
   * ✅ CORRIGIDO: Garante que o nome e a descrição do protagonista sejam substituídos no ROTEIRO.
   */
  async generateStoryBookStoryline(characters, theme, summary, sceneCount) {
    try {
      let systemPrompt = prompts.STORY_BOOK_STORYLINE_SYSTEM_PROMPT;
      
      const mainCharacter = characters[0];
      const translatedTheme = await translationService.translateToEnglish(theme);
      const translatedSummary = await translationService.translateToEnglish(summary);
      const translatedProtagonistDescription = await translationService.translateToEnglish(mainCharacter.description);

      console.log(`[VisionService] Gerando roteiro de história (em inglês). Personagens: ${mainCharacter.name}`);

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

      // ✅ ADIÇÃO CRÍTICA: Substitui os placeholders no resultado JSON bruto do GPT.
      // Isso corrige o bug onde "[PROTAGONIST_NAME]" aparecia no prompt final do Leonardo.
      resultText = resultText
        .replace(/\[PROTAGONIST_NAME\]/g, mainCharacter.name)
        .replace(/\[PROTAGONIST_DESCRIPTION\]/g, translatedProtagonistDescription);
        
      const result = JSON.parse(resultText);

      if (!result.story_pages || !Array.isArray(result.story_pages)) {
          throw new Error('A IA não retornou "story_pages" como um array de objetos.');
      }
      
      return result.story_pages.map(page => ({ 
          ...page, 
          illustration_prompt: this.sanitizePromptForSafety(page.illustration_prompt) 
      }));
    } catch (error) {
      console.error(`[VisionService] Erro ao gerar o roteiro do livro de história: ${error.message}`);
      throw new Error(`Falha na geração do roteiro da história: ${error.message}`);
    }
  }

  /**
   * ✅ CORRIGIDO: Garante que o nome e a descrição do protagonista sejam substituídos na CAPA.
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
        .replace(/\[PROTAGONIST_NAME\]/g, mainCharacter.name) // Substitui o nome
        .replace(/\[PROTAGONIST_DESCRIPTION\]/g, translatedProtagonistDescription) // Substitui a descrição
        .replace(/\[BOOK_TITLE\]/g, translatedTitle || '')
        .replace(/\[BOOK_GENRE\]/g, translatedGenre || '')
        .replace(/\[CHARACTER_NAMES\]/g, characterNames || ''); // Mantém para o caso do prompt precisar

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
      throw new Error(`Falha ao gerar descrição da capa: ${error.message}`);
    }
  }

  // A função de roteiro para livro de colorir não precisa ser alterada, pois não usa a descrição complexa do personagem.
  async generateColoringBookStoryline(characters, theme, pageCount) {
    try {
      let systemPrompt = prompts.COLORING_BOOK_STORYLINE_SYSTEM_PROMPT;
      
      const translatedTheme = await translationService.translateToEnglish(theme);
      const characterDetails = characters.map(c => c.name).join(' and ');

      console.log(`[VisionService] Gerando roteiro de colorir (em inglês). Personagens: ${characterDetails}, Tema: ${theme}`);

      systemPrompt = systemPrompt
        .replace(/\[CHARACTER_DETAILS\]/g, characterDetails)
        .replace(/\[THEME\]/g, translatedTheme)
        .replace(/\[PAGE_COUNT\]/g, pageCount.toString());

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Create the story in ${pageCount} scenes for the theme "${translatedTheme}".` }
        ],
        max_tokens: 350 * pageCount,
      });

      const result = JSON.parse(response.choices[0].message.content);
      if (!result.pages || !Array.isArray(result.pages)) throw new Error('A IA não retornou "pages" como um array.');
      
      return result.pages.map(p => this.sanitizePromptForSafety(p));
    } catch (error) {
      console.error(`[VisionService] Erro ao gerar o roteiro do livro de colorir: ${error.message}`);
      throw new Error(`Falha na geração do roteiro: ${error.message}`);
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
      'shooting': 'streaking'
    };

    for (const [key, value] of Object.entries(forbiddenMap)) {
        const regex = new RegExp(`\\b${key}\\b`, 'gi');
        sanitizedPrompt = sanitizedPrompt.replace(regex, value);
    }
    
    const dangerousWords = ['sexy', 'nude', 'violence', 'blood', 'gun', 'kill', 'shot'];
    const dangerousRegex = new RegExp('\\b(' + dangerousWords.join('|') + ')\\b', 'gi');
    sanitizedPrompt = sanitizedPrompt.replace(dangerousRegex, 'happy scene');

    return sanitizedPrompt;
  }
}
module.exports = new VisionService();