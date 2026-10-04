// Router Commandes
// chemin : /api/orders

const express = require("express");
const { create, getMine, getById, getAll, updateStatus } = require("../controllers/OrderController");
const { verifyToken, requireRole } = require("../../middleware/authMiddleware");
const { ROLES, STAFF_ROLES } = require("../../config/constants");
const router = express.Router();

// Toutes les routes commandes nécessitent d'être connecté
// (CDC 2.2 : un visiteur consulte le catalogue mais n'achète pas)
router.use(verifyToken);

// POST /api/orders - Commande en ligne (client) ou vente en caisse (vendeur / admin)
router.post("/", requireRole(ROLES.CLIENT, ...STAFF_ROLES), create);

// GET /api/orders/me - Historique du client connecté
router.get("/me", requireRole(ROLES.CLIENT), getMine);

// GET /api/orders - Toutes les commandes, filtrables (vendeur / admin)
router.get("/", requireRole(...STAFF_ROLES), getAll);

// GET /api/orders/:id - Détail d'une commande (propriétaire ou personnel)
router.get("/:id", requireRole(ROLES.CLIENT, ...STAFF_ROLES), getById);

// PUT /api/orders/:id/status - Faire avancer le statut (vendeur / admin)
router.put("/:id/status", requireRole(...STAFF_ROLES), updateStatus);

module.exports = router;
