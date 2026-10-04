// Router Tableau de bord
// chemin : /api/dashboard

const express = require("express");
const { getKpi } = require("../controllers/DashboardController");
const { verifyToken, requireRole } = require("../../middleware/authMiddleware");
const { STAFF_ROLES } = require("../../config/constants");
const router = express.Router();

// GET /api/dashboard/kpi - Indicateurs clés (vendeur / administrateur)
router.get("/kpi", verifyToken, requireRole(...STAFF_ROLES), getKpi);

module.exports = router;
