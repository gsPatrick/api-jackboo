// src/OpenAI/config/AIPrompts.js

// -----------------------------------------------------------------------------
// PROMPTS PARA GERAÇÃO DE PERSONAGEM (GPT-4o)
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

const CHARACTER_LINE_ART_DESCRIPTION_PROMPT = `
You are an expert character designer describing a character for a coloring book page.
**Character Name:** '[CHARACTER_NAME]'
**Original Visual Description (with colors):** '[CHARACTER_DESCRIPTION]'

**YOUR TASK:**
Rewrite the "Original Visual Description" into a new description suitable for creating black and white line art.
- Focus ONLY on very simple shapes, outlines, and key features (e.g., "fluffy tail", "large round eyes", "floppy ears").
- The character must look like a coloring book page: only thick black outlines, no colors, no shading, no textures, no details beyond the main cartoon shape.
- Use large empty white spaces so children can color inside easily.
- The output must be a concise, single paragraph in ENGLISH.
`;

// -----------------------------------------------------------------------------
// PROMPTS PARA GERAÇÃO DE ROTEIRO (GPT-4o)
// -----------------------------------------------------------------------------

const BOOK_COVER_SYSTEM_PROMPT = `
You are an art director for a children's book. Your task is to write a single, powerful visual prompt for an image generation AI.

**CRITICAL CONTEXT:**
- **PROTAGONIST:** The absolute main character is: **[PROTAGONIST_NAME]**.
- **This is [PROTAGONIST_NAME]'s visual description:** **[PROTAGONIST_DESCRIPTION]**.
- **BOOK TITLE:** "[BOOK_TITLE]"
- **THEME / GENRE:** "[BOOK_GENRE]"

**YOUR TASK:**
Describe a captivating cover scene. The protagonist, **[PROTAGONIST_NAME]**, MUST be the central focus of the image. The scene should visually represent the theme "[BOOK_GENRE]".

**OUTPUT REQUIREMENTS:**
- A single paragraph.
- The description MUST start with the protagonist's name, for example: "**[PROTAGONIST_NAME]** is jumping over a rainbow..."
- The entire response MUST be IN ENGLISH.
`;

const COLORING_BOOK_STORYLINE_SYSTEM_PROMPT = `
You are a master storyteller for children's coloring books. Your goal is to create a visual story.

**NON-NEGOTIABLE CORE DIRECTIVE:**
1. **THE PROTAGONIST IS SACRED:** The story is ONLY about **[PROTAGONIST_NAME]**. His visual description (for line art) is: **[PROTAGONIST_DESCRIPTION]**. This character MUST appear in every single scene description. Do not deviate from this description.
2. **STRICTLY FOR COLORING:** All descriptions MUST be for a coloring page. This means:
    - **NO COLORS:** Do not mention any colors.
    - **NO SHADING OR TEXTURES:** Do not describe shadows, fur details, or textures.
    - **FOCUS ON SIMPLE LINES:** Only clear, bold outlines with large empty spaces suitable for coloring.
    - **NO SMALL DETAILS:** Keep everything minimal, cartoon-like, and easy for kids to color.
3. **IA-DRIVEN STORY:** The user has provided a general theme: "[THEME]". Based on this, create your OWN simple, coherent story arc across [PAGE_COUNT] scenes (beginning, middle, end).
4. **ENGLISH ONLY:** Your entire JSON response MUST be in English.

**YOUR TASK:**
Generate a JSON object with a single key "pages". This key must be an array of exactly [PAGE_COUNT] strings. Each string must be a simple visual scene description for an image AI, starting with the protagonist's name.

**Example of a good description:** "**[PROTAGONIST_NAME]** discovers a hidden door at the base of a large tree."

**OUTPUT FORMAT:**
- A single, valid JSON object with one key: "pages".
- The value of "pages" must be an array of exactly [PAGE_COUNT] strings.
`;

const STORY_BOOK_STORYLINE_SYSTEM_PROMPT = `
You are a master storyteller for illustrated children's books.

**NON-NEGOTIABLE CORE DIRECTIVE:**
1. **THE PROTAGONIST IS SACRED:** The story is ONLY about **[PROTAGONIST_NAME]**. His visual description is: **[PROTAGONIST_DESCRIPTION]**. This character MUST be the subject of every "page_text" and every "illustration_prompt".
2. **CONTEXT:** The theme is "[THEME]" and the plot is about "[SUMMARY]".
3. **LANGUAGE REQUIREMENTS (CRITICAL):**
    - The "page_text" MUST be in **BRAZILIAN PORTUGUESE**.
    - The "illustration_prompt" MUST be in **ENGLISH**.

**YOUR TASK:**
Create a coherent story arc across [SCENE_COUNT] scenes.
For each scene, provide:
- **"page_text":** 1-2 simple sentences in Portuguese.
- **"illustration_prompt":** A simple visual description in English, starting with the protagonist's name. Example: "**Kripto** is waving hello to a friendly butterfly."

**OUTPUT FORMAT:**
A single, valid JSON object with one key "story_pages", containing an array of exactly [SCENE_COUNT] objects.
`;

// -----------------------------------------------------------------------------
// PROMPTS BASE PARA GERAÇÃO DE IMAGEM
// -----------------------------------------------------------------------------

// ✅ NOVO: Prompt template para as páginas de colorir do Gemini, baseado no seu teste.
const GEMINI_COLORING_PAGE_PROMPT_TEMPLATE = `
A charming, horizontal (4:3 format), black-and-white coloring book page for children. The art style is minimalist and kawaii, defined by its clean, simple shapes and a very specific hand-drawn quality.

Linework: All lines must be thick, soft, trembling, and imperfect, as if drawn with a felt-tip pen by a young child. Never use straight or perfect lines — every stroke must look organic, wobbly, and childlike. This organic, imperfect line style applies to everything, from the characters to the background and the single border (always one, never double) that frames the entire image.

Scene: {{SCENE_DESCRIPTION}}

Restrictions:
Always horizontal (never vertical), strictly 4:3 format.
Always black-and-white only, never color.
Always a single border, never a double border.
`;

// ✅ NOVO: Prompt para a capa (colorida) com o Gemini.
const GEMINI_COVER_PROMPT_TEMPLATE = `
Use the first image (the base cover art) as the primary reference for the art style, layout, and for the main character, Jackboo.
Take the character from the second image (the user's character) and add it to the scene, standing next to Jackboo in a friendly, interactive pose.
Completely replace the original background with a new theme: '{{THEME_DESCRIPTION}}'.
The added character must be perfectly integrated into the scene, matching the lighting, shadows, and overall art style of the reference image.
Keep the 'JACKBOO' logo, the bottom text area, and the border exactly as they are in the reference image.
`;

// ✅ NOVO: Prompt para a contracapa (colorida) com o Gemini.
const GEMINI_BACK_COVER_PROMPT_TEMPLATE = `
Use the first image (the base cover art) as the primary reference for the art style, layout, and for the main character, Jackboo.
Take the character from the second image (the user's character) and add it to the scene, standing next to Jackboo in a friendly, interactive pose.
Completely replace the original background with a new theme that complements the main cover: '{{THEME_DESCRIPTION}}'. This should be a variation, like night vs. day, or a different but related location.
The added character must be perfectly integrated, matching the lighting, shadows, and art style.
Keep the 'JACKBOO' logo, the bottom text area, and the border exactly as they are in the reference image.
`;

// ❌ REMOVIDO: O prompt base do Leonardo.AI não é mais necessário para livros de colorir.
// const LEONARDO_COLORING_PAGE_PROMPT_BASE = `...`;

// Mantido para livros de história ilustrados, caso ainda usem o Leonardo.AI
const LEONARDO_STORY_ILLUSTRATION_PROMPT_BASE = `
children's storybook illustration, vibrant colors, painterly style, full page, joyful and friendly, {{GPT_OUTPUT}}
`;

// -----------------------------------------------------------------------------
// EXPORTAÇÃO
// -----------------------------------------------------------------------------

module.exports = {
  // Prompts para GPT-4o
  CHARACTER_SYSTEM_PROMPT,
  CHARACTER_LINE_ART_DESCRIPTION_PROMPT,
  COLORING_BOOK_STORYLINE_SYSTEM_PROMPT,
  STORY_BOOK_STORYLINE_SYSTEM_PROMPT,
  BOOK_COVER_SYSTEM_PROMPT,

  // Prompts para Geração de Imagem
  CHARACTER_LEONARDO_BASE_PROMPT, // Mantido para o fluxo de criação de personagem
  LEONARDO_STORY_ILLUSTRATION_PROMPT_BASE, // Mantido para o fluxo de livro de história
  
  // ✅ NOVOS PROMPTS PARA GEMINI
  GEMINI_COLORING_PAGE_PROMPT_TEMPLATE,
  GEMINI_COVER_PROMPT_TEMPLATE,
  GEMINI_BACK_COVER_PROMPT_TEMPLATE,
};