// src/OpenAI/services/openai.service.js

const OpenAI = require('openai');

class VisionService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não está configurada.');
    }
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }


  /**
   * --- NOVA FUNÇÃO: Remove todas as menções de cores de uma descrição. ---
   * @param {string} description - A descrição original do personagem.
   * @returns {string} A descrição sem palavras de cor.
   */
  sanitizeDescriptionForColoring(description) {
    if (!description) return '';
    const colorWords = [
      'amarela', 'amarelo', 'laranja', 'azul', 'azuis', 'marrom', 'verde', 
      'vermelho', 'rosa', 'preto', 'branco', 'cinza', 'roxo', 'violeta', 
      'dourado', 'prateado', 'colorido', 'colorida'
    ];
    // Cria uma expressão regular para encontrar qualquer uma dessas palavras inteiras, ignorando maiúsculas/minúsculas
    const regex = new RegExp('\\b(' + colorWords.join('|') + ')\\b', 'gi');
    // Substitui as cores por nada e limpa espaços duplos
    return description.replace(regex, '').replace(/\s\s+/g, ' ').trim();
  }

  

 async describeImage(imageUrl) {
    try {
      console.log(`[VisionService] Solicitando descrição DETALHADA para a imagem: ${imageUrl}`);
      
      const messages = [
        {
          role: "user",
          content: [
            {
              type: "text",
              // --- CORREÇÃO: Prompt ainda mais robusto para evitar bloqueios de conteúdo ---
              text: "Analise a imagem como um conceito de arte para um personagem. Não a descreva como uma entidade real, criança ou pessoa. O seu único objetivo é extrair os atributos visuais para um artista 2D replicar o estilo. Liste apenas as características físicas, como 'formato do corpo de urso', 'pelagem amarela', 'orelhas arredondadas', 'camiseta listrada'. Seja objetivo e técnico."
            },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ];

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        max_tokens: 150,
      });

      const description = response.choices[0].message.content.trim();
      console.log("[VisionService] Descrição detalhada recebida:", description);
      
      return description;

    } catch (error) {
      console.error('[VisionService] Erro ao chamar a API de visão:', error.response ? error.response.data : error.message);
      const errorMessage = error.response?.data?.error?.message || error.message;
      throw new Error(`Falha na análise da imagem: ${errorMessage}`);
    }
  }
 /**
   * Gera uma lista de prompts para as páginas de um livro de colorir.
   * --- CORREÇÃO: A assinatura da função é atualizada para aceitar a descrição. ---
   * @param {string} characterName - O nome do personagem principal.
   * @param {string} characterDescription - A descrição visual do personagem.
   * @param {string} theme - O tema do livro (ex: "Aventura no zoológico").
   * @param {number} pageCount - O número de páginas a serem geradas.
   * @returns {Promise<string[]>} Um array de prompts de ilustração.
   */
   /**
   * Gera uma lista de prompts para as páginas de um livro de colorir.
   */
/**
   * Gera uma lista de prompts para as páginas de um livro de colorir.
   */
  /**
   * Gera uma lista de prompts para as páginas de um livro de colorir.
   */
 /**
   * Gera uma lista de prompts para as páginas de um livro de colorir com uma narrativa coesa.
   */
   async generateColoringBookStoryline(characterName, characterDescription, theme, pageCount) {
    try {
      console.log(`[VisionService] Gerando roteiro NARRATIVO para livro de colorir. Personagem: ${characterName}, Tema: ${theme}, Páginas: ${pageCount}`);

      // --- CORREÇÃO FINAL: O "Prompt de Diretor de Cinema" com saída em INGLÊS ---
      const systemPrompt = `You are a senior art director and storyboarder for a premium coloring book publisher. Your task is to create a complete and sequential visual story in ${pageCount} scenes for a book with the theme "${theme}".

      THE MAIN CHARACTER:
      - His name is "${characterName}" (NEVER use his name in the final output).
      - His visual description is: "${characterDescription}".

      **NON-NEGOTIABLE DIRECTIONAL RULES:**

      1.  **COMPLETE NARRATIVE ARC:**
          - The ${pageCount} scenes must tell a clear story with a beginning, middle, and end. Create a logical and emotional progression.
          - The first scene must introduce the setting and the character's initial motivation.
          - The middle scenes must develop the journey with actions, discoveries, or small challenges.
          - The final scene must provide a satisfying and coherent visual conclusion to the narrative.

      2.  **TOTAL IMMERSION (THE GOLDEN RULE):**
          - The character must NEVER break the "fourth wall" or look at the reader. He must be completely immersed in the scene.
          - **Direct the Gaze:** Describe where the character is looking. Ex: "looking at the star he is holding," "looking down at the cookie dough."
          - **Constant Action and Interaction:** The character must always be in motion or interacting with something. Crouching, jumping, running, focused, surprised. No static poses.

      3.  **DETAILED SCENE CHECKLIST (for each page):**
          - **Action and Pose:** Describe the exact action and pose of the character (e.g., "crouching, in profile, with an expression of curiosity").
          - **Thematic Setting:** The setting must be rich, detailed, and 100% focused on the theme "${theme}".
          - **Key Interactive Objects (2-3):** List 2-3 clear objects the character interacts with directly.
          - **Narrative Background:** The background must complement the scene and story with clear, large shapes, easy to color.

      4.  **SAFETY & STYLE RULES:**
          - **Do NOT use sensitive words** like "child," "boy," "baby." Use neutral terms like "friendly figures" or "other characters."
          - The style is LINE ART for a coloring book. No color, no shadows.

      **MANDATORY OUTPUT FORMAT:**
      Your response MUST be a JSON object with a single key "pages", which is an array of ${pageCount} strings. Each string is a complete and detailed scene prompt, **WRITTEN ENTIRELY IN ENGLISH**.`;
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Create the complete visual story in ${pageCount} scenes for the theme "${theme}". Remember to create a sequential narrative, omit the character's name, and write all prompts in English.`
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
      console.error('[VisionService] Erro ao gerar o roteiro do livro de colorir:', error.message);
      throw new Error(`Falha na geração do roteiro: ${error.message}`);
    }
  }
}

module.exports = new VisionService();