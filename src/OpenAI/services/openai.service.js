// src/OpenAI/services/openai.service.js

const OpenAI = require('openai');
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class VisionService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY não está configurada.');
    }
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Descreve uma imagem usando um template de prompt dinâmico.
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
          max_tokens: 150,
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
   * REATORADO: Gera o roteiro de um livro de colorir. O prompt do sistema agora é interno.
   * Não depende mais de um template do banco de dados.
   */
async generateColoringBookStoryline(characters, theme, pageCount) {
  try {
    const characterDetails = characters.map(c => `- ${c.name}: ${c.description}`).join('\n');
    console.log(`[VisionService] Gerando roteiro de colorir. Personagens: ${characters.map(c => c.name).join(', ')}, Tema: ${theme}`);

    const systemPrompt = `Você é um roteirista e ilustrador de livros de colorir infantis da coleção Jackboo.

🖍️ Estilo artístico obrigatório:
- A imagem deve ser totalmente em preto e branco, sem nenhum tipo de cor, sombra ou efeito de profundidade 3D.
- Os traços devem simular desenhos feitos à mão com leve imperfeição intencional — as linhas não podem ser geométricas, vetoriais ou retas demais. Elas devem ter um leve aspecto trêmulo, orgânico e artesanal, como se tivessem sido desenhadas com caneta ou lápis por um ilustrador infantil experiente.
- A espessura das linhas deve ser média e constante (sem detalhes finos), lembrando o uso de um marcador de cerca de 3px.
- Os contornos devem ser bem definidos, porém suaves, com curvas naturais e proporções amigáveis para crianças.
- O estilo visual deve transmitir doçura, calma e originalidade, se diferenciando dos livros de colorir comuns.

🧸 Personagens da Turma do Jackboo:
${characterDetails}
- Cada cena deve conter no máximo 2 ou 3 personagens.

📏 Postura e comportamento dos personagens:
- Os personagens nunca devem olhar diretamente para o leitor. Eles devem estar de perfil, de costas ou com o olhar voltado para o ambiente e os objetos da cena.
- Eles devem interagir ativamente com o cenário — exemplo: preparando comida, lavando, organizando, plantando, lendo, desenhando etc.
- As proporções corporais devem sempre estar coerentes com o ambiente (altura de mesas, distância de objetos, tamanho das mãos etc.).

🌳 Ambientes:
- O ambiente deve ser o protagonista visual da cena, com vários elementos grandes e pequenos para colorir: objetos, utensílios, natureza, móveis, alimentos, decorações, quadros, almofadas, livros, copos, janelas, chão, teto, paredes etc.
- O fundo nunca pode estar vazio. Deve conter detalhes como céu com nuvens, árvores, cortinas, plantas ou móveis, dependendo do cenário.
- A composição deve ter profundidade visual simples, com primeiro e segundo plano preenchidos, sempre mantendo o estilo infantil.

🎯 Objetivo:
Criar cenas de um livro de colorir com aparência encantadora e artesanal, onde o foco principal é o ambiente, e os personagens da Turma do Jackboo participam de forma contextualizada. O traço deve parecer feito à mão, com imperfeição leve e charme autoral.

📚 Formato de Saída:
Responda com um JSON contendo a chave "pages", com exatamente ${pageCount} descrições visuais simples e diretas. Exemplo:

{
  "pages": [
    "Jackboo e Daisy preparando limonada em uma mesa de varanda com jarra, copos, frutas e toalha decorada.",
    "Bella e Oliver lavando roupas em uma lavanderia com cestos, baldes, sabão, varal e plantas na janela."
  ]
}
`.trim();

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
   * ✅ VERSÃO CORRIGIDA: Gera o roteiro de um livro de HISTÓRIA ILUSTRADO. 
   * A função duplicada e incorreta foi removida.
   */
    async generateStoryBookStoryline(characters, theme, summary, sceneCount) {
    try {
      const characterDetails = characters.map(c => `- ${c.name}: ${c.description}`).join('\n');
      console.log(`[VisionService] Gerando roteiro de história. Personagens: ${characters.map(c=>c.name).join(', ')}`);

      const finalSystemPrompt = `Você é um autor de livros de história infantis.
Regras:
1.  **Personagens:** A história DEVE ser sobre estes personagens:
${characterDetails}
2.  **Tema e Resumo:** Siga o tema "${theme}" e o resumo do usuário: "${summary}".
3.  **Estrutura:** Crie exatamente ${sceneCount} cenas.
4.  **Formato de Saída:** Responda com um JSON contendo a chave "story_pages", um array de objetos.
5.  **Objeto de Cena:** Cada objeto deve ter duas chaves: "page_text" (o texto da página) e "illustration_prompt" (o prompt para a imagem).
Exemplo: {"story_pages": [{"page_text": "...", "illustration_prompt": "..."}, ...]}`.trim();
      
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: finalSystemPrompt }, { role: "user", content: `Gere a história em ${sceneCount} cenas.` }],
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