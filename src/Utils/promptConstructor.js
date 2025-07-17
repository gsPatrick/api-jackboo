// src/Utils/promptConstructor.js

/**
 * Escapa caracteres especiais para uso em RegExp.
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Constrói o prompt final para a API da OpenAI DALL-E.
 * @param {string} basePromptText - O texto principal do prompt definido pelo admin.
 * @param {Array<object>} [baseAssets=[]] - Array de objetos AdminAsset associados.
 * @param {object} context - Objeto com informações para a geração (livro, personagem, etc.).
 * @returns {string} O prompt final formatado.
 */
function constructPrompt(basePromptText, baseAssets = [], context = {}) {
  let prompt = basePromptText;
  const { book, character, userInputs } = context;

  const replacements = {};

  if (book) {
    replacements['[TITLE]'] = book.title || '';
    if (book.mainCharacter) {
      replacements['[CHARACTER_NAME]'] = book.mainCharacter.name || '';
      replacements['[CHARACTER_DESC]'] = book.mainCharacter.description || '';
    }
  }

  if (character) {
    replacements['[CHARACTER_NAME]'] = character.name || '';
    replacements['[CHARACTER_DESC]'] = character.description || '';
    if (character.traits) {
      replacements['[CHARACTER_TRAITS]'] = JSON.stringify(character.traits);
    }
  }
  
  if (userInputs) {
    for (const key in userInputs) {
      const placeholder = `[${key.toUpperCase()}]`;
      replacements[placeholder] = userInputs[key] || '';
    }
  }

  // Executa a substituição dos placeholders
  for (const placeholder in replacements) {
    const regex = new RegExp(escapeRegExp(placeholder), 'g');
    prompt = prompt.replace(regex, replacements[placeholder]);
  }
  
  // Remove placeholders não substituídos
  prompt = prompt.replace(/\[[A-Z_]+\]/g, '').trim();

  // --- LÓGICA DE IMAGEM DE REFERÊNCIA ---
  // Adiciona as descrições dos assets de imagem base ao final do prompt.
  // Isso guia a IA para seguir um estilo visual.
  if (baseAssets && baseAssets.length > 0) {
    const assetDescriptions = baseAssets
      .map(asset => asset.description)
      .filter(Boolean); // Filtra descrições nulas ou vazias
      
    if (assetDescriptions.length > 0) {
      prompt += `\n\n--- INSTRUÇÕES DE ESTILO VISUAL ---\nO estilo deve ser fortemente inspirado por estas descrições: ${assetDescriptions.join('. ')}.`;
    }
  }
  // ------------------------------------

  const MAX_PROMPT_LENGTH = 4000;
  if (prompt.length > MAX_PROMPT_LENGTH) {
    console.warn('Prompt excedeu o tamanho máximo e foi truncado.');
    prompt = prompt.substring(0, MAX_PROMPT_LENGTH);
  }

  console.log(`[Prompt Final Gerado]:\n${prompt}`);
  return prompt.trim();
}

module.exports = { constructPrompt };