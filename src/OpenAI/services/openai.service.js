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

      // --- CORREÇÃO FINAL: O "Prompt Definitivo" que incorpora todas as sugestões avançadas ---
      const systemPrompt = `Você é um diretor de arte e roteirista sênior para uma editora de livros de colorir premium, criando conteúdo para crianças de 4 a 7 anos. Sua tarefa é criar ${pageCount} prompts de cena para um livro com o tema central "${theme}" e o personagem principal "${characterName}".

      DESCRIÇÃO VISUAL DO PERSONAGEM (para forma e consistência): "${characterDescription}".

      **DIRETRIZES RÍGIDAS PARA CADA CENA:**
      Para cada uma das ${pageCount} páginas, o prompt gerado deve seguir este checklist de 7 pontos sem exceção:

      1.  **AÇÃO IMERSIVA (REGRA DE OURO):**
          - O personagem NUNCA deve quebrar a "quarta parede" (olhar para o leitor). Ele deve estar completamente focado e imerso na cena, interagindo com objetos ou com o ambiente.
          - A ação deve ser dinâmica e expressiva (correndo, pulando, agachado, olhando curioso para algo, etc.).

      2.  **CENÁRIO TEMÁTICO:**
          - O cenário deve ser 100% relacionado ao tema "${theme}". Cada detalhe do fundo deve reforçar a história.

      3.  **OBJETOS INTERATIVOS (2-3):**
          - Liste 2 ou 3 objetos claros e bem definidos com os quais o personagem interage diretamente.

      4.  **FUNDO NARRATIVO:**
          - Descreva o fundo de forma a complementar a cena, com formas grandes e claras, fáceis de colorir, e com poucos elementos (máximo de 6 elementos visuais principais por página).

      5.  **PROIBIÇÃO DE OBJETOS GENÉRICOS:**
          - Não incluir formas geométricas aleatórias, círculos flutuando ou objetos sem função clara. Tudo na cena deve ser compreensível por uma criança.

      6.  **ESTILO DE ARTE:**
          - O resultado deve ser uma composição rica em ação, mas para uma página de livro de colorir com contornos pretos, grossos e limpos. Sem cor, sombras ou texturas.

      7.  **ATMOSFERA:**
          - A cena deve transmitir uma emoção clara (alegria, concentração, surpresa, etc.).

      **ESTRUTURA OBRIGATÓRIA DA DESCRIÇÃO:**
      - Cada prompt deve ter de 4 a 6 linhas descritivas.
      - Nunca comece a descrição com o nome do personagem. Comece com a ação principal da cena.
      - Mantenha o foco na coerência entre ação, cenário, objetos e fundo.

      **FORMATO OBRIGATÓRIO DA RESPOSTA:**
      Sua resposta DEVE ser um objeto JSON com uma única chave "pages", que é um array de strings. Cada string é o prompt completo para uma página.`;
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            // --- CORREÇÃO: Adicionando o reforço do tema no prompt do usuário ---
            content: `O tema principal é "${theme}" com o personagem "${characterName}". Gere a lista de ${pageCount} prompts de cena, seguindo rigorosamente o checklist e a estrutura de descrição.`
          }
        ],
        max_tokens: 350 * pageCount,
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