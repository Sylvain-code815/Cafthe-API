// Router Articles
// chemin : /api/articles

const express = require("express");
const { getAll, getById, getByCategorie, getPromo } = require("../controllers/ArticleController");

const router = express.Router();

// GET /api/articles - Récupérer tous les articles
router.get("/", getAll);

// GET /api/articles/promo - Récupérer les articles en promotion
router.get("/promo", getPromo);

// GET /api/articles/categorie - Récupérer les articles d'une catégorie
router.get("/categorie/:categorie", getByCategorie);

// GET /api/articles/:id - Récupérer un article par son Id
router.get("/:id", getById);

// On doit exporter "router" (l'objet d'Express), et non les fonctions !
module.exports = router;