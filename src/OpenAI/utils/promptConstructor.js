// src/Utils/promptConstructor.js

/**
 * Constrói o prompt final para a API da OpenAI DALL-E, substituindo placeholders.
 * Esta função agora é o ponto central para toda a construção de prompts.
 *
 * @param {string} basePromptText - O texto principal do prompt definido pelo admin (ex: "Capa para o livro [TITLE]...").
 * @param {Array<object>} [baseAssets=[]] - Array de objetos AdminAsset (com description, url, etc.).
 * @param {object} context - Objeto contendo todas as informações disponíveis para a geração.
 * @param {object} [context.book] - O objeto do modelo Book, com suas associações.
 * @param {object} [context.character] - O objeto do modelo Character, se aplicável.
 * @param {object} [context.userInputs] - Inputs específicos do usuário para a geração (ex: { lugar, tema }).
 * @returns {string} O prompt final formatado e pronto para a IA.
 */
function constructPrompt(basePromptText, baseAssets = [], context = {}) {
  let prompt = basePromptText;
  const { book, character, userInputs } = context;

  // 1. Definição de todos os possíveis placeholders e seus valores
  const replacements = {};

  if (book) {
    replacements['[TITLE]'] = book.title || '';
    if (book.mainCharacter) {
      replacements['[CHARACTER_NAME]'] = book.mainCharacter.name || '';
      replacements['[CHARACTER_DESC]'] = book.mainCharacter.description || '';
    }
  }

  if (character) {
    // Para casos onde um personagem é gerado fora do contexto de um livro
    replacements['[CHARACTER_NAME]'] = character.name || '';
    replacements['[CHARACTER_DESC]'] = character.description || '';
    if (character.traits) {
      replacements['[CHARACTER_TRAITS]'] = JSON.stringify(character.traits);
    }
  }
  
  if (userInputs) {
    // Substitui placeholders genéricos a partir dos inputs do usuário
    // Ex: [LUGAR], [TEMA], [VILAO], etc.
    for (const key in userInputs) {
      const placeholder = `[${key.toUpperCase()}]`;
      replacements[placeholder] = userInputs[key] || '';
    }
  }

  // 2. Executa a substituição dos placeholders no prompt
  for (const placeholder in replacements) {
    // Usa uma RegEx global para substituir todas as ocorrências do placeholder
    const regex = new RegExp(escapeRegExp(placeholder), 'g');
    prompt = prompt.replace(regex, replacements[placeholder]);
  }
  
  // 3. Remove quaisquer placeholders que não foram substituídos, para limpar o prompt
  prompt = prompt.replace(/\[[A-Z_]+\]/g, '').trim();

  // 4. Adiciona descrições das imagens base (assets), se existirem
  if (baseAssets && baseAssets.length > 0) {
    const assetDescriptions = baseAssets.map(asset => asset.description || asset.name).filter(Boolean);
    if (assetDescriptions.length > 0) {
      prompt += `\nReferência de estilo visual: ${assetDescriptions.join(', ')}.`;
    }
  }

  // Limita o tamanho do prompt para segurança
  const MAX_PROMPT_LENGTH = 4000;
  if (prompt.length > MAX_PROMPT_LENGTH) {
    console.warn('Prompt excedeu o tamanho máximo e foi truncado.');
    prompt = prompt.substring(0, MAX_PROMPT_LENGTH);
  }

  console.log(`[Prompt Final Gerado]: ${prompt}`);
  return prompt.trim();
}

/**
 * Escapa caracteres especiais para uso em RegExp.
 * @param {string} string - A string a ser escapada.
 */
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { constructPrompt };