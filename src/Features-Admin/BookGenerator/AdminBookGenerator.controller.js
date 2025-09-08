// src/Features-Admin/BookGenerator/AdminBookGenerator.controller.js
const contentService = require('../../Features/Content/Content.service');
const adminBooksService = require('../Books/AdminBooks.service'); // Usaremos este para buscar detalhes

const ADMIN_USER_ID = 1; // ID do usuário "Sistema/JackBoo"

class AdminBookGeneratorController {
    /**
     * Recebe os dados de geração do livro do frontend do admin e chama o serviço unificado.
     * Esta é a principal rota de criação de livros para o admin.
     */
    async generatePreview(req, res, next) {
        try {
            // Desestrutura os dados do corpo da requisição.
            // O frontend do admin enviará todos os dados necessários, incluindo os IDs dos Elements.
            const { bookType, ...generationData } = req.body;
            
            // Monta o objeto de dados para o serviço unificado 'createBook'.
            const creationData = {
                authorId: ADMIN_USER_ID,
                bookType,
                ...generationData // Passa todos os outros dados (characterIds, title, theme, elementId, coverElementId, etc.)
            };

            // Chama o serviço de conteúdo unificado.
            const result = await contentService.createBook(creationData);
            
            // Retorna o registro inicial do livro. A geração das páginas ocorre em segundo plano.
            res.status(200).json(result.book);

        } catch (error) {
            console.error("Erro no AdminBookGeneratorController ao gerar preview:", error);
            next(error); // Passa o erro para o middleware de tratamento de erros global.
        }
    }

    /**
     * Busca os detalhes completos de um livro pelo seu ID.
     * Útil para o painel de admin visualizar o resultado ou o progresso da geração.
     */
     async getBookById(req, res, next) {
        try {
            const { bookId } = req.params;
            // A lógica para buscar um livro por ID já existe no AdminBooksService.
            // É uma boa prática reutilizá-la.
            const book = await adminBooksService.findOfficialBookById(bookId);
            res.status(200).json(book);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AdminBookGeneratorController();