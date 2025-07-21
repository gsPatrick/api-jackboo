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
  async generateColoringBookStoryline(characterName, characterDescription, theme, pageCount) {
    try {
      console.log(`[VisionService] Gerando roteiro para livro de colorir. Personagem: ${characterName}, Tema: ${theme}, Páginas: ${pageCount}`);

      // --- CORREÇÃO: Prompt do sistema focado em simplicidade e clareza para crianças. ---
      const systemPrompt = `Você é um autor e ilustrador de livros de colorir para crianças de 3 a 6 anos. Sua especialidade é criar cenas CLARAS, SIMPLES e DIVERTIDAS. Sua tarefa é criar ${pageCount} cenas para um livro sobre o personagem "${characterName}" com o tema "${theme}".

      INFORMAÇÕES VISUAIS DO PERSONAGEM (use para manter a consistência da forma): "${characterDescription}".

      **REGRAS OBRIGATÓRIAS PARA CADA CENA (PROMPT):**

      1.  **SIMPLICIDADE É REI:** As cenas devem ter poucos elementos. O foco é sempre no personagem principal. Evite fundos muito cheios ou complexos.
      2.  **FORMAS GRANDES E CLARAS:** Descreva objetos com formas grandes e contornos bem definidos. Pense em algo que uma criança pequena consiga pintar sem frustração.
      3.  **AÇÃO CLARA E ÚNICA:** Cada página deve mostrar "${characterName}" fazendo UMA ação principal e fácil de entender (ex: empilhando um bloco, cheirando uma flor, abraçando um urso de pelúcia).
      4.  **INTERAÇÃO DIRETA:** O personagem deve interagir diretamente com 1 ou 2 objetos principais. Exemplo: "Jack, com um sorriso gentil, está sentado no chão e cuidadosamente colocando um bloco triangular no topo de uma pequena torre de três blocos."
      5.  **EVITAR ALUCINAÇÕES:** Seja específico sobre os 2-3 elementos mais importantes da cena para que a IA não invente detalhes estranhos.
      6.  **PROIBIÇÕES ABSOLUTAS:** NUNCA mencione cores, sombras, gradientes, ou texturas. A imagem final deve ser 100% arte de linha (line art) preta sobre um fundo branco.
      7.  **FORMATO JSON:** Sua resposta DEVE ser um objeto JSON com uma única chave "pages", que é um array de strings. Cada string é o prompt para uma página.`;
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Gere a lista de ${pageCount} prompts de cena simples e claros agora para "${characterName}" no tema "${theme}".` }
        ],
        max_tokens: 200 * pageCount, // Ajustado para prompts mais concisos
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