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
const systemPrompt = `Você é um roteirista-chefe e diretor de arte de uma editora de livros de colorir premium. Sua missão é criar uma **história visual sequencial e imersiva** dividida em ${pageCount} cenas ilustradas para um livro com o tema **"${theme}"**.

O personagem principal se chama "${characterName}" e possui a seguinte descrição visual: "${characterDescription}". **ATENÇÃO: nunca mencione o nome dele nas descrições.**

---

**REGRAS FUNDAMENTAIS E INEGOCIÁVEIS:**

1. **ARCO NARRATIVO COMPLETO:**
   - As ${pageCount} páginas devem contar uma história clara com **início, meio e fim**, com progressão lógica e emocional.
   - A primeira cena deve **apresentar o ambiente e a motivação inicial** do personagem.
   - As cenas intermediárias devem **desenvolver a jornada com ações, descobertas ou pequenos desafios**.
   - A cena final deve apresentar uma **conclusão visual satisfatória e coerente** com a narrativa.

2. **CONSISTÊNCIA VISUAL TOTAL:**
   - O personagem principal **deve manter exatamente a mesma aparência, roupa e idade** ao longo de todas as páginas.
   - **Não pode parecer mais velho, mais novo, maior ou menor** de uma página para outra.
   - O design visual do personagem é fixo e inalterável.

3. **IMERSÃO ABSOLUTA:**
   - O personagem **nunca deve olhar para a "câmera" ou interagir com o leitor**. 
   - Ele deve estar **vivendo plenamente a história**, olhando para o que faz sentido dentro da cena (outros personagens, objetos, ações, cenários).

4. **RICOS DETALHES VISUAIS EM TODAS AS CENAS:**
   Para cada página, você deve descrever os seguintes elementos com riqueza e coerência:

   - **Ação principal:** Uma ação clara, expressiva e significativa que move a narrativa.
   - **Cenário:** Deve ser **detalhado, coerente com a cena anterior e 100% focado no tema "${theme}"**. Nunca reutilize fundo genérico.
   - **Objetos interativos:** Inclua **2 a 3 elementos relevantes** para a história que o personagem pode tocar, usar ou reagir.
   - **Fundo:** O fundo **nunca pode ser genérico ou vazio**. Ele deve reforçar o ambiente da cena e conter formas interessantes para colorir.

5. **SEM TEXTO NAS IMAGENS:**
   - **Não pode haver nenhuma palavra, letra ou símbolo textual** nos desenhos.
   - Tudo deve ser transmitido apenas com ação, ambientação e narrativa visual.

6. **SEM MENÇÃO AO NOME DO PERSONAGEM:**
   - Durante toda a descrição, **nunca utilize o nome "${characterName}"**.
   - Refira-se a ele apenas como “o personagem principal” ou “o personagem”.

---

**SAÍDA OBRIGATÓRIA:**

Retorne a resposta como um objeto JSON com uma única chave \`"pages"\`, cujo valor é um array com ${pageCount} strings, cada uma representando um prompt visual descritivo completo de uma página da história.

**Exemplo da estrutura esperada:**
{
  "pages": [
    "Prompt da página 1...",
    "Prompt da página 2...",
    "...",
    "Prompt da página ${pageCount}"
  ]
}

**Reforce o tema "${theme}" em todas as cenas**. Cada página deve ser visualmente poderosa, logicamente conectada e perfeitamente coerente com a anterior.`;

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
