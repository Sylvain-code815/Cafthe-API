// Router Articles
// chemin : /api/articles

const express = require("express");
// const {getAll} = require("../models/ArticleModel");
const { getAll, getById, getByCategory } = require("../controllers/ArticleController");
// const {verifyToken} = require("../../middleware/authMiddleware"); Pour vérifier que ça marche, se login sur un onglet, il faut comment dans ClientController la ligne d'expiration || "1h", se relogin dans un autre onglet
const router = express.Router();

// GET /api/articles - Récupérer tous les articles
router.get("/", getAll);
// router.get("/", verifyToken, getAll); Faire un get classique sur POST pour vérifier, ça doit retourner 403 forbidden

// GET /api/articles/:id - Récupérer un article par son Id
router.get("/:id", getById);

// GET /api/articles/categorie - Récupérer les articles d'une catégorie
router.get("/categorie/:categorie", getByCategory);

module.exports = router;