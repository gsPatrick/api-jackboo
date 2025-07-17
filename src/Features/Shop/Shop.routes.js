const { Router } = require('express');
const shopController = require('./Shop.controller');

const router = Router();

// Rota para a Lojinha do JackBoo
// GET /api/shop/jackboo?page=1&limit=12&categoryId=2
router.get('/jackboo', shopController.getJackbooShelf);

// Rota para a Lojinha dos Amigos
// GET /api/shop/friends?page=1&sortBy=popularity&ageRatingId=3
router.get('/friends', shopController.getFriendsShelf);

// Rota para a página de detalhes de um produto (pode ser acessada de qualquer loja)
// GET /api/shop/books/:id
router.get('/books/:id', shopController.getBookDetails);

// Rota para buscar livros relacionados
// GET /api/shop/related?authorId=1&bookType=historia&excludeBookId=15
router.get('/related', shopController.getRelatedBooks); 

module.exports = router;