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
   async generateColoringBookStoryline(characterName, characterDescription, theme, pageCount) {
    try {
      console.log(`[VisionService] Gerando roteiro para livro de colorir. Personagem: ${characterName}, Tema: ${theme}, Páginas: ${pageCount}`);

      // --- CORREÇÃO FINAL: Prompt de "Diretor de Arte Exigente" ---
      const systemPrompt = `Você é um diretor de arte e roteirista sênior para uma editora de livros de colorir de alta qualidade, como a "Bobby Goodes". Sua tarefa é criar ${pageCount} prompts de cena VIVAS e IMERSIVAS para um livro com o tema "${theme}" e o personagem principal "${characterName}".

      DESCRIÇÃO VISUAL DO PERSONAGEM (para forma e consistência): "${characterDescription}".

      **DIRETRIZES RÍGIDAS PARA CADA CENA:**
      Para cada uma das ${pageCount} páginas, o prompt gerado deve seguir este checklist de 6 pontos sem exceção:

      1.  **AÇÃO IMERSIVA (REGRA DE OURO):**
          - O personagem NUNCA deve quebrar a "quarta parede" ou olhar para o leitor. Ele deve estar completamente imerso na cena.
          - Descreva a ação e o foco do personagem. Se ele está escrevendo uma carta, ele deve estar olhando para a carta. Se está decorando uma árvore, deve estar olhando para o enfeite.
          - A ação deve ser dinâmica (correndo, pulando, agachado, esticando-se, etc.).

      2.  **CENÁRIO TEMÁTICO:**
          - O cenário deve ser claramente identificável e 100% relacionado ao tema "${theme}".
          - Exemplo para o tema "Natal": não apenas "uma sala", mas "uma sala de estar aconchegante com uma lareira crepitante e guirlandas nas paredes".

      3.  **OBJETOS INTERATIVOS ESPECÍFICOS (2-3):**
          - Liste 2 ou 3 objetos claros e bem definidos com os quais o personagem interage diretamente. Isso evita que a IA invente elementos estranhos.
          - Exemplo: "Ele segura um biscoito em forma de estrela e uma bisnaga de glacê."

      4.  **FUNDO RICO E COERENTE:**
          - O fundo deve complementar a cena e o tema. Se a cena é na cozinha, o fundo deve ter armários de cozinha, uma janela, talvez um pote de farinha.
          - O fundo deve ser simples o suficiente para colorir, com formas claras e sem excesso de detalhes.

      5.  **ESTILO DE ARTE (Para a IA de Imagem):**
          - O resultado deve ser uma página de livro de colorir com contornos pretos, grossos e limpos. Sem cor, sem sombras, sem texturas. Estilo amigável e imaginativo.

      6.  **ATMOSFERA:**
          - A cena deve transmitir uma emoção clara (alegria, concentração, surpresa, etc.).

      **FORMATO OBRIGATÓRIO:** Sua resposta DEVE ser um objeto JSON com uma única chave "pages", que é um array de strings. Cada string é o prompt completo para uma página.`;
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Gere a lista de ${pageCount} prompts de cena imersivos e detalhados agora para "${characterName}" no tema "${theme}", seguindo o checklist rigorosamente.` }
        ],
        max_tokens: 350 * pageCount, // Um pouco mais de espaço para garantir a riqueza dos detalhes
      });

      const result = JSON.parse(response.choices[0].message.content);
      
      if (!result.pages || !Array.isArray(result.pages) || result.pages.length === 0) {
        throw new Error('A IA não retornou a lista de páginas no formato esperado.');
      }
      
      console.log("[VisionService] Roteiro do livro de colorir recebido com sucesso.");
      return result.pages.slice(0, pageCount);

    } catch (error) {
      console.error('[VisionService] Erro ao gerar o roteiro do livro de colorir:', error.message);
      throw new Error(`Falha na geração do roteiro: ${error.message}`);
    }
  }
}

module.exports = new VisionService();