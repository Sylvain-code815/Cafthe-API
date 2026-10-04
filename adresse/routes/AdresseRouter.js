// Router Adresses
// chemin : /api/adresses

const express = require("express");
const { getAll, create, update, remove } = require("../controllers/AdresseController");
const { verifyToken, requireRole } = require("../../middleware/authMiddleware");
const { ROLES } = require("../../config/constants");

const router = express.Router();

// Toutes les routes adresses sont réservées au client connecté
router.use(verifyToken, requireRole(ROLES.CLIENT));

// GET /api/adresses - Récupérer les adresses du client connecté
router.get("/", getAll);

// POST /api/adresses - Créer une adresse
router.post("/", create);

// PUT /api/adresses/:id - Modifier une adresse
router.put("/:id", update);

// DELETE /api/adresses/:id - Supprimer une adresse
router.delete("/:id", remove);

module.exports = router;
