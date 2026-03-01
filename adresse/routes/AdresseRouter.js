// Router Adresses
// chemin : /api/adresses

const express = require("express");
const { getAll, create, update, remove } = require("../controllers/AdresseController");
const { verifyToken } = require("../../middleware/authMiddleware");

const router = express.Router();

// Toutes les routes adresses sont protégées
// GET /api/adresses - Récupérer les adresses du client connecté
router.get("/", verifyToken, getAll);

// POST /api/adresses - Créer une adresse
router.post("/", verifyToken, create);

// PUT /api/adresses/:id - Modifier une adresse
router.put("/:id", verifyToken, update);

// DELETE /api/adresses/:id - Supprimer une adresse
router.delete("/:id", verifyToken, remove);

module.exports = router;
