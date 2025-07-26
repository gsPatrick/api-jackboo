// src/Features-Admin/Books/AdminBooks.service.js
const { Book, BookVariation, BookContentPage, Character } = require('../../models');
const { Op } = require('sequelize');


const ADMIN_USER_ID = 1; // ID do usuário "Sistema/JackBoo"

class AdminBooksService {
    /**
     * Lista todos os livros pertencentes ao usuário sistema (oficiais).
     */
    async listOfficialBooks(filters = {}) {
        const { page = 1, limit = 10, title, status } = filters;
        const whereClause = { authorId: ADMIN_USER_ID };

        if (title) whereClause.title = { [Op.iLike]: `%${title}%` };
        if (status) whereClause.status = status;

        const { count, rows } = await Book.findAndCountAll({
            where: whereClause,
            include: [
                { model: Character, as: 'mainCharacter', attributes: ['name', 'generatedCharacterUrl'] },
                { 
                    model: BookVariation, 
                    as: 'variations',
                    attributes: ['type', 'coverUrl'],
                    // ✅ CORREÇÃO: Inclui as páginas para que o preview tenha dados.
                    include: [{ model: BookContentPage, as: 'pages', attributes: ['id', 'status'] }]
                }
            ],
            limit: parseInt(limit, 10),
            offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
            order: [['createdAt', 'DESC']],
            distinct: true,
        });

        return { totalItems: count, books: rows, totalPages: Math.ceil(count / limit), currentPage: parseInt(page, 10) };
    }

    /**
     * Busca um livro oficial completo por ID, incluindo todas as páginas.
     */
    async findOfficialBookById(id) {
        const book = await Book.findOne({
            where: { id, authorId: ADMIN_USER_ID },
            include: [
                { model: Character, as: 'mainCharacter' },
                {
                    model: BookVariation,
                    as: 'variations',
                    include: [{
                        model: BookContentPage,
                        as: 'pages',
                    }]
                }
            ],
            order: [
                [{ model: BookVariation, as: 'variations' }, { model: BookContentPage, as: 'pages' }, 'pageNumber', 'ASC']
            ]
        });

        if (!book) throw new Error('Livro oficial não encontrado.');
        return book;
    }

    /**
     * Deleta um livro oficial.
     */
    async deleteOfficialBook(id) {
        const book = await Book.findOne({ where: { id, authorId: ADMIN_USER_ID } });
        if (!book) throw new Error('Livro oficial não encontrado.');
        
        await book.destroy();
        return { message: 'Livro oficial deletado com sucesso.' };
    }

     async listAllBooks() {
        const books = await Book.findAll({
            where: {
                authorId: ADMIN_USER_ID
            },
            include: [
                {
                    model: BookVariation,
                    as: 'variations',
                    limit: 1 
                },
                {
                    model: Character,
                    as: 'mainCharacter',
                    attributes: ['name']
                }
            ],
            order: [['createdAt', 'DESC']]
        });
        return { books };
    }


    async updateOfficialBookStatus(id, status) {
    if (!['privado', 'publicado'].includes(status)) {
        throw new Error('Status inválido. Use "privado" ou "publicado".');
    }
    const book = await this.findOfficialBookById(id);
    book.status = status;
    await book.save();
    return book;
}

 /**
     * ✅ NOVO MÉTODO: Lista todos os livros que NÃO pertencem ao admin.
     */
    async listUserBooks(filters = {}) {
        const { page = 1, limit = 20 } = filters;
        const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

        const { count, rows } = await Book.findAndCountAll({
            where: {
                authorId: { [Op.ne]: ADMIN_USER_ID } // A condição principal: autor NÃO É o admin
            },
            include: [
                { model: BookVariation, as: 'variations', limit: 1 },
                { model: Character, as: 'mainCharacter', attributes: ['name'] },
                // Inclui os dados do autor do livro
                { model: User, as: 'author', attributes: ['id', 'nickname', 'email'] }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit, 10),
            offset: offset,
            distinct: true,
        });

        return { totalItems: count, books: rows, totalPages: Math.ceil(count / limit), currentPage: parseInt(page, 10) };
    }

    /**
     * ✅ CORREÇÃO: Deleta qualquer livro por ID, sem verificar o autor.
     * Seguro, pois a rota é protegida pelo middleware isAdmin.
     */
    async deleteOfficialBook(id) { // O nome pode ser mantido, mas a lógica é genérica
        const book = await Book.findByPk(id);
        if (!book) throw new Error('Livro não encontrado.');
        
        await book.destroy();
        return { message: 'Livro deletado com sucesso.' };
    }
    

}

module.exports = new AdminBooksService();