// src/OpenAI/services/openai.service.js

const OpenAI = require('openai');

class VisionService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não está configurada.');
    }
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
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
  async generateColoringBookStoryline(characterName, characterDescription, theme, pageCount) {
    try {
      console.log(`[VisionService] Gerando roteiro para livro de colorir. Personagem: ${characterName}, Tema: ${theme}, Páginas: ${pageCount}`);

      // --- CORREÇÃO: Prompt do sistema radicalmente mais detalhado e prescritivo ---
      const systemPrompt = `Você é um diretor de arte especialista em criar livros de colorir infantis de alta qualidade. Sua tarefa é criar um roteiro com ${pageCount} cenas detalhadas para um livro sobre o personagem "${characterName}" e o tema "${theme}".

      INFORMAÇÕES VISUAIS DO PERSONAGEM (essencial para consistência): "${characterDescription}".

      **REGRAS OBRIGATÓRIAS PARA CADA CENA (PROMPT):**

      1.  **PERSONAGEM CENTRAL:** O personagem "${characterName}" deve ser o foco claro da cena, sempre realizando uma ação específica e com uma expressão facial clara (ex: sorrindo, surpreso, concentrado).
      2.  **AÇÃO E AMBIENTE DETALHADOS:** Descreva a cena com minúcia. Em vez de "decorando a árvore", diga "está na ponta dos pés, pendurando um enfeite em forma de estrela no galho mais alto de um grande pinheiro".
      3.  **OBJETOS ESPECÍFICOS:** Liste de 2 a 3 objetos secundários importantes na cena para evitar que a IA invente elementos estranhos. (ex: "No chão, há uma caixa de enfeites aberta e um trenó de madeira.").
      4.  **COMPOSIÇÃO CLARA:** Descreva a cena pensando em primeiro plano, plano de fundo e composição geral para criar uma imagem equilibrada e fácil de entender.
      5.  **FOCO EM "COLORIBILIDADE":** Todas as descrições devem resultar em imagens com contornos pretos, grossos e bem definidos, com áreas de bom tamanho para as crianças pintarem.
      6.  **PROIBIÇÕES ABSOLUTAS:** NUNCA mencione cores, sombras, gradientes, texturas complexas ou qualquer tipo de preenchimento. A imagem final deve ser 100% arte de linha (line art).
      7.  **FORMATO JSON:** Sua resposta DEVE ser um objeto JSON com uma única chave "pages", que é um array de strings. Cada string é o prompt detalhado para uma página.`;
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Gere a lista de ${pageCount} prompts de cena detalhados agora para "${characterName}" no tema "${theme}".` }
        ],
        max_tokens: 250 * pageCount, // Aumenta os tokens para permitir respostas mais detalhadas
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