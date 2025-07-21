// src/Features-Admin/BookGenerator/AdminBookGenerator.controller.js
const AdminBookGeneratorService = require('./AdminBookGenerator.service');

class AdminBookGeneratorController {
    async generatePreview(req, res, next) {
        try {
            // bookType e os dados da geração vêm no corpo da requisição
            const { bookType, ...generationData } = req.body;
            
            // Chama o serviço que agora orquestra todo o processo
            const book = await AdminBookGeneratorService.generateBookPreview(bookType, generationData);
            
            // Retorna o livro criado para que o frontend possa usar o ID para redirecionar
            res.status(200).json(book);
        } catch (error) {
            console.error("Erro no controller ao gerar preview do livro:", error);
            next(error); // Passa o erro para o middleware de erro
        }
    }

    // A função de regenerar página precisa ser repensada, pois dependia da lógica antiga.
    // Vamos desativá-la por enquanto.
    /*
    async regeneratePage(req, res, next) {
        // ... Lógica futura para regerar uma página usando o novo sistema ...
    }
    */

    // A função de finalizar o livro pode permanecer, mas precisa ser testada
    // após a geração ser concluída com sucesso.
    /*
    async finalizeBook(req, res, next) {
        // ...
    }
    */
}

module.exports = new AdminBookGeneratorController();