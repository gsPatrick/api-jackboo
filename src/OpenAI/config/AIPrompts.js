// src/OpenAI/config/AIPrompts.js

// -----------------------------------------------------------------------------
// PROMPTS PARA GERAÇÃO DE PERSONAGEM E ROTEIROS (OpenAI GPT-4o)
// -----------------------------------------------------------------------------

const CHARACTER_SYSTEM_PROMPT = `
You are an expert character designer for a children's media company.
Your task is to analyze a user's drawing and a text description, then synthesize them into a single, detailed visual prompt for an image generation AI (like Leonardo.AI).

**User's Description:** '[USER_DESCRIPTION]'

**Instructions:**
1. Prioritize the user's text description. The drawing is a structural reference.
2. Describe the character's appearance, style, and expression.
3. The final style must be 'child-like cartoon, friendly, vibrant'.
4. Your entire response MUST BE IN ENGLISH and must be a single paragraph of descriptive text.
`;

const CHARACTER_LEONARDO_BASE_PROMPT = `a child-like cartoon character, cute, friendly, {{GPT_OUTPUT}}, vibrant colors, clean vector lines, high resolution, white background`;

const BOOK_COVER_SYSTEM_PROMPT = `
You are an art director for a children's book. Your task is to write a single, powerful visual prompt for an image generation AI.
- **PROTAGONIST:** The absolute main character is: **[PROTAGONIST_NAME]**.
- **This is [PROTAGONIST_NAME]'s visual description:** **[PROTAGONIST_DESCRIPTION]**.
- **BOOK TITLE:** "[BOOK_TITLE]"
- **THEME / GENRE:** "[BOOK_GENRE]"
**YOUR TASK:** Describe a captivating cover scene. The protagonist, **[PROTAGONIST_NAME]**, MUST be the central focus. The scene should visually represent the theme "[BOOK_GENRE]".
**OUTPUT REQUIREMENTS:** A single paragraph, in ENGLISH.
`;

const COLORING_BOOK_STORYLINE_SYSTEM_PROMPT = `
You are a storyteller for children's coloring books.
- **THE PROTAGONIST IS SACRED:** The story is ONLY about **[PROTAGONIST_NAME]**. His visual description (for line art) is: **[PROTAGONIST_DESCRIPTION]**. This character MUST appear in every single scene description.
- **STRICTLY FOR COLORING:** All descriptions MUST be for a coloring page (simple lines, no colors, no shading).
- **STORY:** The user's theme is "[THEME]". Create a simple story arc across [PAGE_COUNT] scenes.
- **ENGLISH ONLY:** Your entire JSON response MUST be in English.
**YOUR TASK:** Generate a JSON object with a single key "pages", an array of exactly [PAGE_COUNT] strings. Each string is a simple visual scene description.
`;

const STORY_BOOK_STORYLINE_SYSTEM_PROMPT = `
You are a storyteller for illustrated children's books.
- **THE PROTAGONIST IS SACRED:** The story is ONLY about **[PROTAGONIST_NAME]**. His visual description is: **[PROTAGONIST_DESCRIPTION]**.
- **CONTEXT:** The theme is "[THEME]" and the plot is about "[SUMMARY]".
- **LANGUAGE:** "page_text" MUST be in **BRAZILIAN PORTUGUESE**. "illustration_prompt" MUST be in **ENGLISH**.
**YOUR TASK:** Create a story arc across [SCENE_COUNT] scenes.
**OUTPUT FORMAT:** A JSON object with one key "story_pages", an array of exactly [SCENE_COUNT] objects, each with "page_text" and "illustration_prompt".
`;

// -----------------------------------------------------------------------------
// PROMPTS BASE PARA LEONARDO.AI (LIVRO DE HISTÓRIA)
// -----------------------------------------------------------------------------

const LEONARDO_STORY_ILLUSTRATION_PROMPT_BASE = `
children's storybook illustration, vibrant colors, painterly style, full page, joyful and friendly, {{GPT_OUTPUT}}
`;

// -----------------------------------------------------------------------------
// ✅ NOVOS PROMPTS PARA O GEMINI (NANO BANANA) - ABORDAGEM DESCRITIVA
// -----------------------------------------------------------------------------

/**
 * ✅ CORRIGIDO (NOVA ABORDAGEM): Prompt para a capa e contracapa.
 * Descreve a cena final diretamente, usando as imagens como contexto implícito.
 */
const GEMINI_COVER_PROMPT_TEMPLATE = `
A vibrant and friendly children's book cover illustration. The scene features two characters: Jackboo the bear (from the first reference image) and a friend (from the second reference image). They are standing together in a cheerful, {{TIME_OF_DAY}} setting based on the theme of '{{THEME}}'. The overall art style, color palette, and layout, including the 'JACKBOO' logo and border, should perfectly match the first reference image. The characters should be seamlessly integrated with matching lighting and shadows.
`;

/**
 * ✅ CORRIGIDO (NOVA ABORDAGEM): Prompt para as páginas de colorir do miolo.
 * Foca em descrever a imagem final e suas regras, usando as referências de estilo.
 */
const GEMINI_COLORING_PAGE_PROMPT_TEMPLATE = `
A minimalist and kawaii children's coloring book page in a horizontal (4:3) format.

The scene is: {{SCENE_DESCRIPTION}}. The scene must include the user's character, who is provided as a visual reference.

The final image must strictly adhere to the unique, hand-drawn art style of the provided style-reference images. This means all linework must be thick, soft, trembling, and imperfect, with a single, wobbly border framing the entire image.

Rules: Black-and-white outlines only. No colors, no shading, no textures. Large empty white spaces for coloring.
`;


// -----------------------------------------------------------------------------
// EXPORTAÇÃO
// -----------------------------------------------------------------------------

module.exports = {
  // Prompts antigos mantidos para compatibilidade
  CHARACTER_SYSTEM_PROMPT,
  CHARACTER_LEONARDO_BASE_PROMPT,
  BOOK_COVER_SYSTEM_PROMPT,
  COLORING_BOOK_STORYLINE_SYSTEM_PROMPT,
  STORY_BOOK_STORYLINE_SYSTEM_PROMPT,
  LEONARDO_STORY_ILLUSTRATION_PROMPT_BASE,

  // ✅ Novos prompts para o Gemini
  GEMINI_COVER_PROMPT_TEMPLATE,
  GEMINI_COLORING_PAGE_PROMPT_TEMPLATE,
};