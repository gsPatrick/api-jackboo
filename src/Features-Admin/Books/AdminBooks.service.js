// src/Features-Admin/BookTemplates/AdminBookTemplates.service.js
const { BookTemplate, PageTemplate, OpenAISetting, Book, sequelize } = require('../../../models');
const { Op } = require('sequelize');

class AdminBookTemplatesService {
  // --- CRUD para BookTemplates ---

  async createBookTemplate(data) {
    const { name, description, systemType, isActive = true } = data;
    if (!name) throw new Error('Nome do template é obrigatório.');

    // Validação: Se for um systemType específico (USER_COLORING_BOOK, USER_STORY_BOOK), garante que não haja duplicidade.
    if (systemType !== 'CUSTOM') {
      const existingSystemTemplate = await BookTemplate.findOne({ where: { systemType } });
      if (existingSystemTemplate) {
        throw new Error(`Já existe um template com o tipo de sistema "${systemType}". Edite-o em vez de criar um novo.`);
      }
    }

    const newTemplate = await BookTemplate.create({ name, description, systemType, isActive });
    return newTemplate;
  }

  async listBookTemplates(filters = {}) {
    const { page = 1, limit = 10, name, systemType, isActive } = filters;
    const whereClause = {};

    if (name) whereClause.name = { [Op.iLike]: `%${name}%` };
    if (systemType) whereClause.systemType = systemType;
    if (isActive !== undefined) whereClause.isActive = isActive;

    const { count, rows } = await BookTemplate.findAndCountAll({
      where: whereClause,
      include: [
        { model: PageTemplate, as: 'pageTemplates', attributes: ['id', 'name', 'pageType', 'order'] },
        // Contagem de livros criados com este template
        [sequelize.fn("COUNT", sequelize.col("books.id")), "booksCount"]
      ],
      limit: parseInt(limit, 10),
      offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
      order: [['systemType', 'ASC'], ['name', 'ASC']],
      group: ['BookTemplate.id', 'pageTemplates.id'],
      distinct: true,
    });
    
    // O group/distinct retorna um formato diferente, precisamos reformatar
    const formattedRows = this._formatTemplateList(rows);

    return { totalItems: count.length, bookTemplates: formattedRows, totalPages: Math.ceil(count.length / limit), currentPage: parseInt(page, 10) };
  }
  
  _formatTemplateList(rows) {
      const templatesMap = new Map();
      rows.forEach(row => {
          const templateData = row.toJSON();
          if (!templatesMap.has(templateData.id)) {
              templatesMap.set(templateData.id, {
                  ...templateData,
                  pageTemplates: [],
                  booksCount: templateData.booksCount || 0
              });
          }
          const existingTemplate = templatesMap.get(templateData.id);
          if (templateData.pageTemplates && templateData.pageTemplates.id) {
               // Evita adicionar a mesma página múltiplas vezes
              if (!existingTemplate.pageTemplates.some(p => p.id === templateData.pageTemplates.id)) {
                  existingTemplate.pageTemplates.push(templateData.pageTemplates);
              }
          }
      });
      return Array.from(templatesMap.values());
  }


  async getBookTemplateById(id) {
    const template = await BookTemplate.findByPk(id, {
      include: [
        { 
          model: PageTemplate, 
          as: 'pageTemplates', 
          include: [{ model: OpenAISetting, as: 'aiSetting', attributes: ['id', 'type'] }],
          order: [['order', 'ASC']]
        }
      ]
    });
    if (!template) throw new Error('Template de livro não encontrado.');
    return template;
  }

  async updateBookTemplate(id, data) {
    const template = await this.getBookTemplateById(id);
    const { name, description, systemType, isActive } = data;

    if (systemType && systemType !== 'CUSTOM' && template.systemType !== systemType) {
      const existingSystemTemplate = await BookTemplate.findOne({ where: { systemType, id: { [Op.ne]: id } } });
      if (existingSystemTemplate) {
        throw new Error(`Já existe outro template com o tipo de sistema "${systemType}".`);
      }
    }

    await template.update({ name, description, systemType, isActive });
    return this.getBookTemplateById(id);
  }

  async deleteBookTemplate(id) {
    const template = await BookTemplate.findByPk(id);
    if (!template) throw new Error('Template de livro não encontrado.');
    
    if (template.systemType !== 'CUSTOM') {
      throw new Error('Não é possível deletar templates de sistema. Apenas desativá-los.');
    }

    const booksCount = await Book.count({ where: { bookTemplateId: id } });
    if (booksCount > 0) {
      throw new Error(`Não é possível deletar este template, pois ele está associado a ${booksCount} livro(s).`);
    }

    await template.destroy();
    return { message: 'Template de livro deletado com sucesso.' };
  }

  // --- CRUD para PageTemplates ---

  async createPageTemplate(bookTemplateId, pageData) {
    const bookTemplate = await this.getBookTemplateById(bookTemplateId);
    const { name, pageType, order, repeatCount, userPromptSchema, openAISettingId } = pageData;

    if (!name || !pageType || order === undefined) {
      throw new Error('Campos obrigatórios (name, pageType, order) não fornecidos.');
    }
    
    if (openAISettingId) {
      const aiSetting = await OpenAISetting.findByPk(openAISettingId);
      if (!aiSetting) throw new Error('Configuração de IA não encontrada.');
    }

    const newPage = await PageTemplate.create({
      bookTemplateId: bookTemplate.id,
      name,
      pageType,
      order,
      repeatCount: repeatCount || 1,
      userPromptSchema: userPromptSchema || null,
      openAISettingId: openAISettingId || null,
    });
    return newPage;
  }

  async updatePageTemplate(pageId, pageData) {
    const page = await PageTemplate.findByPk(pageId);
    if (!page) throw new Error('Template de página não encontrado.');
    
    if (pageData.openAISettingId !== undefined) {
      if (pageData.openAISettingId !== null) {
        const aiSetting = await OpenAISetting.findByPk(pageData.openAISettingId);
        if (!aiSetting) throw new Error('Configuração de IA não encontrada.');
      }
    }
    
    await page.update(pageData);
    return page;
  }

  async deletePageTemplate(pageId) {
    const page = await PageTemplate.findByPk(pageId);
    if (!page) throw new Error('Template de página não encontrado.');
    
    await page.destroy();
    return { message: 'Template de página deletado com sucesso.' };
  }
}

module.exports = new AdminBookTemplatesService();