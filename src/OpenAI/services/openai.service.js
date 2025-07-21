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
  async generateColoringBookStoryline(characterName, characterDescription, theme, pageCount) {
    try {
      console.log(`[VisionService] Gerando roteiro para livro de colorir. Personagem: ${characterName}, Tema: ${theme}, Páginas: ${pageCount}`);

      // --- CORREÇÃO: O prompt do sistema agora usa a descrição do personagem ---
      const systemPrompt = `Você é um roteirista especialista em criar livros de colorir para crianças. Sua tarefa é criar um roteiro com ${pageCount} cenas para um livro sobre o personagem "${characterName}" com o tema "${theme}".

      INFORMAÇÕES VISUAIS DO PERSONAGEM (use para manter a consistência): "${characterDescription}".

      REGRAS PARA CADA CENA (PROMPT):
      1.  **Foco em Ação Simples:** Cada prompt deve descrever uma ação clara e simples que "${characterName}" está fazendo. Ex: "${characterName} constrói um castelo de areia", "${characterName} decora uma árvore".
      2.  **Ambiente Rico, mas Aberto:** Descreva o cenário ao redor, mas deixe espaços abertos para a criança colorir. Ex: "...na praia com conchas espalhadas", "...na floresta com cogumelos e flores".
      3.  **Ideal para Colorir:** As descrições devem resultar em imagens com contornos claros e áreas bem definidas, ideais para um livro de colorir. Não descreva sombras, cores ou texturas complexas.
      4.  **Formato JSON OBRIGATÓRIO:** Sua resposta deve ser um objeto JSON com uma única chave "pages", que é um array de strings. Cada string é o prompt para uma página.`;
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Gere a lista de ${pageCount} prompts de cena agora para "${characterName}" no tema "${theme}".` }
        ],
        max_tokens: 150 * pageCount,
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