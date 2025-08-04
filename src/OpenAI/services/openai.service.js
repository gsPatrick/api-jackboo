// src/OpenAI/services/openai.service.js

const OpenAI = require('openai');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const promptService = require('./prompt.service');

class VisionService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não está configurada.');
    }
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Descreve uma imagem usando um template de prompt dinâmico.
   * O promptTemplate agora vem do OpenAISetting.basePromptText.
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
          max_tokens: 350,
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
   * REATORADO: Gera o roteiro de um livro de colorir. O prompt do sistema agora é dinâmico,
   * vindo da configuração OpenAISetting 'USER_COLORING_BOOK_STORYLINE'.
   */
  async generateColoringBookStoryline(characters, theme, pageCount) {
    try {
      const setting = await promptService.getPrompt('USER_COLORING_BOOK_STORYLINE');
      let systemPrompt = setting.basePromptText;

      const characterDetails = characters.map(c => `- ${c.name}: ${c.description}`).join('\n');
      console.log(`[VisionService] Gerando roteiro de colorir. Personagens: ${characters.map(c => c.name).join(', ')}, Tema: ${theme}`);

      // Substituição de placeholders no prompt do sistema
      systemPrompt = systemPrompt
        .replace(/\[CHARACTER_DETAILS\]/g, characterDetails)
        .replace(/\[PAGE_COUNT\]/g, pageCount.toString());

      // ✅ HARDCODED: Adiciona a instrução JSON ao final do prompt do sistema
      // Isso garante que a API da OpenAI retorne um JSON válido.
      systemPrompt += `\n\nSua resposta DEVE ser um objeto JSON com a chave "pages", contendo um array de strings, com exatamente ${pageCount} descrições visuais. Exemplo: {"pages": ["Descrição 1", "Descrição 2"]}`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Crie a história em ${pageCount} cenas para o tema "${theme}".` }
        ],
        max_tokens: 350 * pageCount,
      });

      const result = JSON.parse(response.choices[0].message.content);
      if (!result.pages || !Array.isArray(result.pages)) throw new Error('A IA não retornou "pages" como um array.');
      
      console.log("[VisionService] Roteiro do livro de colorir recebido.");
      return result.pages.map(p => this.sanitizePromptForSafety(p));
    } catch (error) {
      console.error(`[VisionService] Erro ao gerar o roteiro do livro de colorir: ${error.message}`);
      throw new Error(`Falha na geração do roteiro: ${error.message}`);
    }
  }

  /**
   * Gera um tema e título para um livro usando um template de prompt do sistema.
   * SEM ALTERAÇÃO: Este método pode continuar com um prompt hardcoded ou ser movido para o DB se necessário.
   */
  async generateBookThemeAndTitle(characterDescription) {
    try {
      console.log(`[VisionService] Gerando TEMA e TÍTULO aleatórios para o livro...`);
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [{
            role: "system",
            content: `Você é um autor de livros infantis. Sua tarefa é criar um tema e um título para um novo livro baseado na descrição de um personagem. A resposta deve ser um JSON com as chaves "theme" e "title". O tema deve ser uma frase curta (ex: "Aventura na Floresta Mágica") e o título deve ser cativante (ex: "Leo e o Segredo da Árvore Falante").`
          },
          {
            role: "user",
            content: `Gere o tema e o título para um personagem descrito como: "${characterDescription}"`
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
        theme: 'Um Dia Divertido de Aventuras',
        title: 'O Livro Mágico de Aventuras'
      };
    }
  }

  /**
   * ATUALIZADO: Gera o roteiro de um livro de HISTÓRIA ILUSTRADO. 
   * O prompt do sistema agora é dinâmico, vindo da configuração OpenAISetting 'USER_STORY_BOOK_STORYLINE'.
   */
  async generateStoryBookStoryline(characters, theme, summary, sceneCount) {
    try {
      const setting = await promptService.getPrompt('USER_STORY_BOOK_STORYLINE');
      let systemPrompt = setting.basePromptText;
      
      const characterDetails = characters.map(c => `- ${c.name}: ${c.description}`).join('\n');
      console.log(`[VisionService] Gerando roteiro de história. Personagens: ${characters.map(c=>c.name).join(', ')}`);

      // Substituição de placeholders no prompt do sistema
      systemPrompt = systemPrompt
        .replace(/\[CHARACTER_DETAILS\]/g, characterDetails)
        .replace(/\[THEME\]/g, theme)
        .replace(/\[SUMMARY\]/g, summary)
        .replace(/\[SCENE_COUNT\]/g, sceneCount.toString());
      
      // ✅ HARDCODED: Adiciona a instrução JSON ao final do prompt do sistema
      // Isso garante que a API da OpenAI retorne um JSON válido.
      systemPrompt += `\n\nSua resposta DEVE ser um objeto JSON com a chave "story_pages", um array de objetos. Cada objeto deve ter duas chaves: "page_text" (o texto da página) e "illustration_prompt" (o prompt para a imagem).`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `Gere a história em ${sceneCount} cenas.` }],
        max_tokens: 400 * sceneCount,
      });

      const result = JSON.parse(response.choices[0].message.content);
      if (!result.story_pages || !Array.isArray(result.story_pages)) throw new Error('A IA não retornou "story_pages" como um array de objetos.');
      
      console.log("[VisionService] Roteiro do livro de história recebido com sucesso.");
      return result.story_pages.map(page => ({ ...page, illustration_prompt: this.sanitizePromptForSafety(page.illustration_prompt) }));
    } catch (error) {
      console.error(`[VisionService] Erro ao gerar o roteiro do livro de história: ${error.message}`);
      throw new Error(`Falha na geração do roteiro da história: ${error.message}`);
    }
  }

  /**
   * NOVO MÉTODO: Gera uma descrição textual para a capa/contracapa do livro.
   * O prompt do sistema agora é dinâmico, vindo da configuração OpenAISetting 'BOOK_COVER_DESCRIPTION_GPT'.
   */
  async generateCoverDescription(bookTitle, bookGenre, characters) {
    try {
      const setting = await promptService.getPrompt('BOOK_COVER_DESCRIPTION_GPT');
      let systemPrompt = setting.basePromptText;

      const characterNames = characters.map(c => c.name).join(' e ');
      console.log(`[VisionService] Gerando descrição para capa. Título: "${bookTitle}", Gênero: "${bookGenre}", Personagens: ${characterNames}`);

      // Substituição de placeholders no prompt do sistema
      systemPrompt = systemPrompt
        .replace(/\[BOOK_TITLE\]/g, bookTitle || '')
        .replace(/\[BOOK_GENRE\]/g, bookGenre || '')
        .replace(/\[CHARACTER_NAMES\]/g, characterNames || '');

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Crie uma descrição detalhada e cativante para a capa do livro "${bookTitle}".` }
        ],
        max_tokens: 150,
      });

      const description = response.choices[0].message.content.trim();
      console.log("[VisionService] Descrição da capa recebida:", description);
      return description;

    } catch (error) {
      console.error('[VisionService] Erro ao gerar descrição da capa:', error.message);
      throw new Error(`Falha ao gerar descrição da capa: ${error.message}`);
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