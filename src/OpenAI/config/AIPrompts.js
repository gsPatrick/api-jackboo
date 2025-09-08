// src/OpenAI/config/AIPrompts.js

// Usado pelo GPT para analisar a imagem do usuário e combiná-la com a descrição textual.
const CHARACTER_SYSTEM_PROMPT = `Analyze the provided reference image and read the user's description. Your task is to create a detailed description for an image generation AI (Leonardo.AI style). Merge both sources of information. The final description must be rich, focused on visual attributes (shape, style, colors, expression), and follow a 'child-like cartoon, friendly, and vibrant' style. The user's description is the main guideline. User's description: '[USER_DESCRIPTION]'. YOUR ENTIRE RESPONSE MUST BE IN ENGLISH.`;
// Usado pelo Leonardo.AI para gerar o personagem. O placeholder será preenchido pelo resultado do GPT.
const CHARACTER_LEONARDO_BASE_PROMPT = `a child-like cartoon character, cute, friendly, {{GPT_OUTPUT}}, vibrant colors, clean vector lines, high resolution, white background`;

// Usado pelo GPT para criar o roteiro (descrições visuais) do livro de colorir.
const COLORING_BOOK_STORYLINE_SYSTEM_PROMPT = `You are a scriptwriter for children's coloring books. Create a list of [PAGE_COUNT] visual scenes, without mentioning any colors, for a book with the theme "[THEME]". The characters are: [CHARACTER_DETAILS]. Your response MUST be a JSON object with the key "pages", containing an array of strings with exactly [PAGE_COUNT] descriptions. YOUR ENTIRE RESPONSE MUST BE IN ENGLISH.`;
// Usado pelo GPT para criar o roteiro (texto da página + prompt de ilustração) do livro de história.
const STORY_BOOK_STORYLINE_SYSTEM_PROMPT = `You are a children's book author. Create a script for a book with [SCENE_COUNT] scenes. The theme is "[THEME]" and the summary is "[SUMMARY]". The characters are: [CHARACTER_DETAILS]. Your response MUST be a JSON object with the key "story_pages", an array of objects. Each object must have two keys: "page_text" (the short, simple text for the child to read) and "illustration_prompt" (a detailed visual description of the scene for the image AI). YOUR ENTIRE RESPONSE, INCLUDING page_text AND illustration_prompt, MUST BE IN ENGLISH.`;

// Usado pelo GPT para gerar a descrição da capa/contracapa.
const BOOK_COVER_SYSTEM_PROMPT = `You are an art director. Create a detailed visual description for the cover of a children's book titled "[BOOK_TITLE]". The genre is "[BOOK_GENRE]" and the main characters are [CHARACTER_NAMES]. The description should be inspiring and rich in detail for an image AI. YOUR ENTIRE RESPONSE MUST BE IN ENGLISH.`;
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