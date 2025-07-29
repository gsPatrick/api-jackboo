// src/Utils/slugGenerator.js
const { User } = require('../models'); // Importar o modelo User para verificar unicidade

async function generateSlug(name) {
    let slug = name.toLowerCase()
                  .normalize("NFD")
                  .replace(/[\u0300-\u036f]/g, "") // Remove acentos
                  .replace(/[^a-z0-9\s-]/g, "") // Remove caracteres especiais
                  .trim()
                  .replace(/\s+/g, "-") // Substitui espaços por hífens
                  .replace(/-+/g, "-"); // Remove múltiplos hífens

    let uniqueSlug = slug;
    let counter = 1;
    // Verifica se o slug já existe no banco de dados e adiciona um contador se sim
    while (await User.findOne({ where: { slug: uniqueSlug } })) {
        uniqueSlug = `${slug}-${counter}`;
        counter++;
    }
    return uniqueSlug;
}

module.exports = { generateSlug };