// src/Features-Admin/Taxonomies/AdminTaxonomies.service.js

const { Category, AgeRating, Book, OpenAISetting, PrintFormat } = require('../../models');
const slugify = require('../../Utils/slugify');

class AdminTaxonomiesService {
  // --- Category CRUD ---
  async createCategory(data) {
    const { name, description } = data;
    const slug = slugify(name);
    return Category.create({ name, slug, description });
  }

  async listCategories() {
    return Category.findAll({ order: [['name', 'ASC']] });
  }

  async findCategoryById(id) {
    const category = await Category.findByPk(id);
    if (!category) throw new Error('Categoria não encontrada.');
    return category;
  }

  async updateCategory(id, data) {
    const category = await this.findCategoryById(id);
    if (data.name) {
      data.slug = slugify(data.name);
    }
    await category.update(data);
    return category;
  }

  async deleteCategory(id) {
    const category = await this.findCategoryById(id);
    const booksInCategory = await Book.count({ where: { categoryId: id } });

    if (booksInCategory > 0) {
      throw new Error(`Não é possível deletar esta categoria, pois ela está associada a ${booksInCategory} livro(s).`);
    }

    await category.destroy();
    return { message: 'Categoria deletada com sucesso.' };
  }

  // --- AgeRating CRUD ---
  async createAgeRating(data) {
    return AgeRating.create(data);
  }

  async listAgeRatings() {
    return AgeRating.findAll({ order: [['order', 'ASC']] });
  }

  async findAgeRatingById(id) {
    const ageRating = await AgeRating.findByPk(id);
    if (!ageRating) throw new Error('Classificação etária não encontrada.');
    return ageRating;
  }

  async updateAgeRating(id, data) {
    const ageRating = await this.findAgeRatingById(id);
    return ageRating.update(data);
  }

  async deleteAgeRating(id) {
    const ageRating = await this.findAgeRatingById(id);
    const booksInAgeRating = await Book.count({ where: { ageRatingId: id } });

    if (booksInAgeRating > 0) {
      throw new Error(`Não é possível deletar esta classificação, pois ela está associada a ${booksInAgeRating} livro(s).`);
    }
    
    await ageRating.destroy();
    return { message: 'Classificação etária deletada com sucesso.' };
  }

  /**
   * CORREÇÃO: Adicionamos 'name' à lista de atributos retornados.
   * Agora o front-end terá o nome do template para exibir no dropdown.
   */
  async listAllAiSettings() {
    return OpenAISetting.findAll({
      where: { isActive: true },
      // AQUI ESTÁ A CORREÇÃO:
      attributes: ['id', 'type', 'name'], 
      order: [['type', 'ASC']]
    });
  }

   // --- CRUD para PrintFormat ---
  async createPrintFormat(data) {
    return PrintFormat.create(data);
  }

  async listPrintFormats() {
    // CORREÇÃO: a API deve retornar um array de objetos, não um objeto com uma chave
    const formats = await PrintFormat.findAll({ where: { isActive: true }, order: [['name', 'ASC']] });
    return formats;
  }

  async updatePrintFormat(id, data) {
    const format = await PrintFormat.findByPk(id);
    if (!format) throw new Error('Formato de impressão não encontrado.');
    return format.update(data);
  }

  async deletePrintFormat(id) {
    const format = await PrintFormat.findByPk(id);
    if (!format) throw new Error('Formato de impressão não encontrado.');

    const booksCount = await Book.count({ where: { printFormatId: id } });
    if (booksCount > 0) {
      throw new Error(`Não é possível deletar este formato, pois ele está associado a ${booksCount} livro(s).`);
    }
    
    await format.destroy();
    return { message: 'Formato de impressão deletado com sucesso.' };
  }

  async listAllAiSettings() {
    return OpenAISetting.findAll({
      where: { isActive: true },
      // AQUI ESTÁ A CORREÇÃO: Retornando todos os campos importantes
      attributes: ['id', 'type', 'name', 'defaultElementId'], 
      order: [['type', 'ASC']]
    });
  }


}

module.exports = new AdminTaxonomiesService();