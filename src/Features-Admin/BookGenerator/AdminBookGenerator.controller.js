// src/Features-Admin/BookGenerator/AdminBookGenerator.controller.js
const AdminBookGeneratorService = require('./AdminBookGenerator.service');

class AdminBookGeneratorController {
    /**
     * Recebe os dados de geração do livro do frontend do admin,
     * incluindo os elementIds selecionados, e passa para o serviço iniciar o processo.
     */
    async generatePreview(req, res, next) {
        try {
            // O corpo da requisição agora contém todos os dados necessários,
            // incluindo os IDs dos Elements para miolo e capa, selecionados pelo admin.
            const { bookType, ...generationData } = req.body;
            
            const book = await AdminBookGeneratorService.generateBookPreview(bookType, generationData);
            
            // Retorna o registro inicial do livro. A geração das páginas ocorre em segundo plano.
            res.status(200).json(book);
        } catch (error) {
            console.error("Erro no AdminBookGeneratorController ao gerar preview:", error);
            next(error); // Passa o erro para o middleware de tratamento de erros global.
        }
    }

    /**
     * Busca os detalhes completos de um livro, incluindo suas variações e páginas.
     */
     async getBookById(req, res, next) {
        try {
            const { bookId } = req.params;
            const book = await AdminBookGeneratorService.findBookById(bookId);
            res.status(200).json(book);
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AdminBookGeneratorController();