const { Category, AgeRating, Book, OpenAISetting, PrintFormat } = require('../../models'); // <-- Adicione PrintFormat
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

  async listAllAiSettings() {
    return OpenAISetting.findAll({
      where: { isActive: true },
      // Retornamos apenas os campos necessários para um <select> no frontend
      attributes: ['id', 'type', 'basePromptText'], 
      order: [['type', 'ASC']]
    });
  }

   // --- NOVO: CRUD para PrintFormat ---
  async createPrintFormat(data) {
    return PrintFormat.create(data);
  }

  async listPrintFormats() {
    return PrintFormat.findAll({ where: { isActive: true }, order: [['name', 'ASC']] });
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
}




module.exports = new AdminTaxonomiesService();