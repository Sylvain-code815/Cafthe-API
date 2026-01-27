// Router Articles
// chemin : /api/articles

const express = require("express");
// const {getAll} = require("../models/ArticleModel");
const { getAll, getById } = require("../controllers/ArticleController");
const router = express.Router();

// GET /api/articles - Récupérer tous les articles
router.get("/", getAll);

// GET /api/articles/:id - Récupérer un article par son Id
router.get("/:id", getById)

module.exports = router;