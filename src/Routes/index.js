const { Router } = require('express');
const authRoutes = require('../Features/Auth/Auth.routes');
const contentRoutes = require('../Features/Content/Content.routes');
const shopRoutes = require('../Features/Shop/Shop.routes');
const checkoutRoutes = require('../Features/Checkout/Checkout.routes');
const popularityRoutes = require('../Features/Popularity/Popularity.routes');
const championshipRoutes = require('../Features/Championship/Championship.routes');
const subscriptionRoutes = require('../Features/Subscription/Subscription.routes');
const addressRoutes = require('../Features/Address/Address.routes');

// Admin routes
const adminCharacterRoutes = require('../Features-Admin/Characters/AdminCharacters.routes');
const adminTaxonomyRoutes = require('../Features-Admin/Taxonomies/AdminTaxonomies.routes');
const adminChampionshipRoutes = require('../Features-Admin/Championships/AdminChampionships.routes');
const adminPlansRoutes = require('../Features-Admin/Plans/AdminPlans.routes');
const adminRoyaltiesRoutes = require('../Features-Admin/Royalties/AdminRoyalties.routes');
const adminOpenAISettingRoutes = require('../OpenAI/Admin/AdminOpenAISetting.routes');
const adminAssetRoutes = require('../Features-Admin/Assets/AdminAsset.routes'); // <-- NOVO: Rotas Admin de Assets
const adminGeneratorRoutes = require('../Features-Admin/BookGenerator/AdminBookGenerator.routes'); // <-- NOVO
const adminBookRoutes = require('../Features-Admin/Books/AdminBooks.routes'); // Importe as novas rotas
const leonardoAdminRoutes = require('../Features-Admin/LeonardoAdmin/LeonardoAdmin.routes');

const router = Router();

router.get('/', (req, res) => {
    res.json({ message: 'API JackBoo v1.0' });
});

// --- Rotas Públicas e de Usuário ---
router.use('/auth', authRoutes);
router.use('/content', contentRoutes);
router.use('/shop', shopRoutes);
router.use('/checkout', checkoutRoutes);
router.use('/popularity', popularityRoutes);
router.use('/championships', championshipRoutes);
router.use('/subscriptions', subscriptionRoutes);
router.use('/addresses', addressRoutes);


// --- Rotas de Administração ---
router.use('/admin/characters', adminCharacterRoutes);
router.use('/admin/taxonomies', adminTaxonomyRoutes);
router.use('/admin/championships', adminChampionshipRoutes);
router.use('/admin/plans', adminPlansRoutes);
router.use('/admin/royalties', adminRoyaltiesRoutes);
router.use('/admin/openai-settings', adminOpenAISettingRoutes);
router.use('/admin/assets', adminAssetRoutes); // <-- NOVO: Adicionar rotas Admin de Assets
router.use('/admin/generator', adminGeneratorRoutes); // <-- NOVO
router.use('/admin/assets', adminAssetRoutes);
router.use('/admin/books', adminBookRoutes); // Diga ao Express para usar as rotas de livros
router.use('/leonardo', leonardoAdminRoutes);
module.exports = router;