// chemin : /api/orders

const express = require("express");
const router = express.Router();
const { order } = require("../controllers/OrderController");

// Inscription d'un client
// POST /api/clients/register
// Body : { id, prix_ttc, quantite }
router.post("/orders", order);

module.exports = router;