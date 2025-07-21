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

      // --- CORREÇÃO FINAL: O "Prompt de Roteirista-Chefe" com foco em narrativa sequencial ---
  const systemPrompt = `Você é um roteirista-chefe e diretor de arte de uma editora de livros de colorir premium. Sua tarefa é criar uma **história visual sequencial completa**, dividida em ${pageCount} páginas, com base no tema central: **"${theme}"**.

**INFORMAÇÕES DO PERSONAGEM PRINCIPAL:**
- Nome: "${characterName}" (não deve ser usado nos prompts).
- Aparência visual: "${characterDescription}".

**OBJETIVO:**
Criar um livro de colorir com uma narrativa visual clara e envolvente, totalmente centrada no tema "${theme}". Cada página deve ter cenas únicas, porém conectadas, formando uma história com começo, meio e fim.

---

**DIRETRIZES ESSENCIAIS (OBRIGATÓRIAS):**

1. **ESTRUTURA NARRATIVA COMPLETA (COMEÇO, MEIO E FIM):**
   - As ${pageCount} páginas devem representar uma narrativa visual contínua.
   - Página 1: Apresentação do personagem e início da jornada dentro do universo "${theme}".
   - Páginas intermediárias: Desenvolvimento da história, com descobertas, aventuras ou pequenos desafios.
   - Última página: Encerramento satisfatório da jornada — retorno, conquista, ou uma conclusão visualmente emocionante.

2. **FOCO ABSOLUTO NO TEMA "${theme}":**
   - Toda ação, cenário, objetos e composição devem reforçar o tema central.
   - Evite elementos genéricos que não pertençam ao universo proposto.

3. **COESÃO E PROGRESSÃO VISUAL ENTRE AS CENAS:**
   - Cada cena deve ser consequência natural da anterior.
   - A transição entre as páginas deve parecer fluida e narrativa, como em um storyboard animado.

4. **REGRAS DE IMERSÃO (REGRA DE OURO):**
   - O personagem principal **jamais deve olhar para o leitor**.
   - Ele deve estar 100% imerso na ação e no ambiente, como se estivesse sendo observado sem saber.

5. **CHECKLIST DE COMPOSIÇÃO PARA CADA CENA:**
   - **Ação Principal:** Uma ação visual clara, dinâmica e relevante à narrativa e ao tema.
   - **Cenário:** Totalmente inserido no universo "${theme}", rico em detalhes, áreas abertas para colorir, e coerente com o ponto da história.
   - **Objetos Interativos:** 2 a 3 objetos que interajam com o personagem ou o ambiente, relacionados ao tema.
   - **Fundo:** Completo, com profundidade visual, mas sempre com áreas pensadas para pintura. Evite fundos genéricos ou vazios sem contexto.

6. **IMPORTANTE:**
   - **NÃO mencionar o nome "${characterName}"** em nenhum prompt.
   - Sempre se referir a ele como "o personagem principal" ou "o personagem".

---

**FORMATO DE SAÍDA (OBRIGATÓRIO):**

Retorne **somente** um objeto JSON com a seguinte estrutura:

\`\`\`json
{
  "pages": [
    "Prompt completo da página 1...",
    "Prompt completo da página 2...",
    "...",
    "Prompt completo da página ${pageCount}..."
  ]
}
\`\`\`

Cada item da array "pages" é um prompt de cena de colorir, **pronto para geração de imagem**, obedecendo às diretrizes acima.

Seja cinematográfico, visual e temático em cada página.`;
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: `Crie a história visual completa em ${pageCount} cenas para o tema "${theme}". Lembre-se de criar uma narrativa sequencial e de omitir o nome do personagem nos prompts finais.`
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
