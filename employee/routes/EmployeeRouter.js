// Router Employés
// chemin : /api/employees

const express = require("express");
const { login, logout, getAll, create, update, remove } = require("../controllers/EmployeeController");
const { verifyToken, requireRole } = require("../../middleware/authMiddleware");
const { authLimiter } = require("../../middleware/rateLimiter");
const { ROLES } = require("../../config/constants");
const router = express.Router();

const adminOnly = [verifyToken, requireRole(ROLES.ADMIN)];

// POST /api/employees/login - Connexion du personnel
router.post("/login", authLimiter, login);

// POST /api/employees/logout - Déconnexion
router.post("/logout", logout);

// Gestion des comptes vendeurs : administrateur uniquement
router.get("/", adminOnly, getAll);
router.post("/", adminOnly, create);
router.put("/:id", adminOnly, update);
router.delete("/:id", adminOnly, remove);

module.exports = router;
