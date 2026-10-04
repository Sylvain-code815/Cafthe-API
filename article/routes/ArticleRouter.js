// Router Articles
// chemin : /api/articles

const express = require("express");
const {
    getAll,
    getById,
    getByCategorie,
    getPromo,
    getPhare,
    create,
    update,
    remove,
} = require("../controllers/ArticleController");
const { verifyToken, requireRole } = require("../../middleware/authMiddleware");
const { ROLES } = require("../../config/constants");

const router = express.Router();

const adminOnly = [verifyToken, requireRole(ROLES.ADMIN)];

// GET /api/articles - Récupérer tous les articles
// Filtres facultatifs : ?category=Thé&search=vert&minPrice=10&maxPrice=20&sort=price_asc&page=1&limit=12
router.get("/", getAll);

// GET /api/articles/promo - Récupérer les articles en promotion
router.get("/promo", getPromo);

// GET /api/articles/phare - Récupérer les produits phares
router.get("/phare", getPhare);

// GET /api/articles/categorie - Récupérer les articles d'une catégorie
router.get("/categorie/:categorie", getByCategorie);

// GET /api/articles/:id - Récupérer un article par son Id
router.get("/:id", getById);

// Routes réservées à l'administrateur : le vigile vérifie le token puis le rôle
// POST /api/articles - Créer un article
router.post("/", adminOnly, create);

// PUT /api/articles/:id - Modifier un article
router.put("/:id", adminOnly, update);

// DELETE /api/articles/:id - Désactiver un article
router.delete("/:id", adminOnly, remove);

module.exports = router;
