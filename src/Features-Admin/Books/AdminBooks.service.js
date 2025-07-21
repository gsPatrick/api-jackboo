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
                    attributes: ['type', 'coverUrl']
                }
            ],
            limit: parseInt(limit, 10),
            offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
            order: [['createdAt', 'DESC']],
            distinct: true, // Necessário por causa do include com hasMany
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
                // Ordena as páginas dentro de cada variação
                [{ model: BookVariation, as: 'variations' }, { model: BookContentPage, as: 'pages' }, 'pageNumber', 'ASC']
            ]
        });

        if (!book) throw new Error('Livro oficial não encontrado.');
        return book;
    }

    /**
     * Deleta um livro oficial.
     * O hook no model Book deve cuidar de deletar as páginas associadas.
     */
    async deleteOfficialBook(id) {
        const book = await Book.findOne({ where: { id, authorId: ADMIN_USER_ID } });
        if (!book) throw new Error('Livro oficial não encontrado.');
        
        // TODO: Adicionar lógica para deletar o PDF final se existir
        // await deleteFile(book.finalPdfUrl);
        
        await book.destroy();
        return { message: 'Livro oficial deletado com sucesso.' };
    }
}

module.exports = new AdminBooksService();