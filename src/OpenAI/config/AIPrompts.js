// src/OpenAI/config/AIPrompts.js

// Usado pelo GPT para analisar a imagem do usuário e combiná-la com a descrição textual.
const CHARACTER_SYSTEM_PROMPT = `Analise a imagem de referência fornecida e leia a descrição do usuário. Sua tarefa é criar uma descrição detalhada para uma IA de geração de imagem (Estilo Leonardo.AI), fundindo as duas fontes. A descrição final deve ser rica, focada em atributos visuais (forma, estilo, cores, expressão) e seguir o estilo 'cartoon infantil, amigável e vibrante'. A descrição do usuário é a principal diretriz. Descrição do usuário: '[USER_DESCRIPTION]'.`;

// Usado pelo Leonardo.AI para gerar o personagem. O placeholder será preenchido pelo resultado do GPT.
const CHARACTER_LEONARDO_BASE_PROMPT = `a child-like cartoon character, cute, friendly, {{GPT_OUTPUT}}, vibrant colors, clean vector lines, high resolution, white background`;

// Usado pelo GPT para criar o roteiro (descrições visuais) do livro de colorir.
const COLORING_BOOK_STORYLINE_SYSTEM_PROMPT = `Você é um roteirista de livros de colorir infantis. Crie uma lista de [PAGE_COUNT] cenas visuais, sem mencionar cores, para um livro com o tema "[THEME]". Os personagens são: [CHARACTER_DETAILS]. Sua resposta DEVE ser um objeto JSON com a chave "pages", contendo um array de strings com exatamente [PAGE_COUNT] descrições.`;

// Usado pelo GPT para criar o roteiro (texto da página + prompt de ilustração) do livro de história.
const STORY_BOOK_STORYLINE_SYSTEM_PROMPT = `Você é um autor de livros infantis. Crie um roteiro para um livro de [SCENE_COUNT] cenas. O tema é "[THEME]" e o resumo é "[SUMMARY]". Os personagens são: [CHARACTER_DETAILS]. Sua resposta DEVE ser um objeto JSON com a chave "story_pages", um array de objetos. Cada objeto deve ter as chaves: "page_text" (o texto curto e simples para a criança ler) e "illustration_prompt" (uma descrição visual detalhada da cena para a IA de imagem).`;

// Usado pelo GPT para gerar a descrição da capa/contracapa.
const BOOK_COVER_SYSTEM_PROMPT = `Você é um diretor de arte. Crie uma descrição visual detalhada para a capa de um livro infantil intitulado "[BOOK_TITLE]". O gênero é "[BOOK_GENRE]" e os personagens principais são [CHARACTER_NAMES]. A descrição deve ser inspiradora e rica em detalhes para uma IA de imagem.`;

// Usado pelo Leonardo.AI para gerar páginas de colorir. O placeholder será preenchido pela descrição de cada cena do GPT.
const LEONARDO_COLORING_PAGE_PROMPT_BASE = `coloring book page for children, clean thick black outlines, no color fill, simple background, {{GPT_OUTPUT}}`;

// Usado pelo Leonardo.AI para gerar ilustrações e capas de livros de história.
const LEONARDO_STORY_ILLUSTRATION_PROMPT_BASE = `children's storybook illustration, vibrant colors, painterly style, full page, joyful and friendly, {{GPT_OUTPUT}}`;

module.exports = {
  CHARACTER_SYSTEM_PROMPT,
  CHARACTER_LEONARDO_BASE_PROMPT,
  COLORING_BOOK_STORYLINE_SYSTEM_PROMPT,
  STORY_BOOK_STORYLINE_SYSTEM_PROMPT,
  BOOK_COVER_SYSTEM_PROMPT,
  LEONARDO_COLORING_PAGE_PROMPT_BASE,
  LEONARDO_STORY_ILLUSTRATION_PROMPT_BASE,
};