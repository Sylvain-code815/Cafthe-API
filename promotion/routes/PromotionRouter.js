// Router Promotions
// chemin : /api/promotions

const express = require("express");
const { getAll, getActive, getById } = require("../controllers/PromotionController");

const router = express.Router();

// GET /api/promotions - Récupérer toutes les promotions
router.get("/", getAll);

// GET /api/promotions/active - Récupérer les promotions actives
router.get("/active", getActive);

// GET /api/promotions/:id - Récupérer une promotion par son id
router.get("/:id", getById);

module.exports = router;
