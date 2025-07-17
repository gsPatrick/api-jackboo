/**
 * Converte uma string em um formato de slug amigável para URLs.
 * @param {string} text - O texto a ser convertido.
 * @returns {string} O texto em formato de slug.
 */
function slugify(text) {
  if (typeof text !== 'string') {
    return '';
  }
  return text.toString().toLowerCase()
    .replace(/\s+/g, '-')       // Substitui espaços por -
    .replace(/[^\w\-]+/g, '')   // Remove caracteres não-palavra (exceto -)
    .replace(/\-\-+/g, '-')     // Substitui múltiplos - por um único -
    .replace(/^-+/, '')         // Remove - do início
    .replace(/-+$/, '');        // Remove - do fim
}

module.exports = slugify;