// chemin : /api/clients

const express = require('express');
const {
    register,
    activate,
    login,
    getMe,
    logout,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    search,
    createInStore,
    getClientDetails,
} = require("../controllers/ClientController");
const { verifyToken, requireRole } = require("../../middleware/authMiddleware");
const { authLimiter } = require("../../middleware/rateLimiter");
const { ROLES, STAFF_ROLES } = require("../../config/constants");
const router = express.Router();

const clientOnly = [verifyToken, requireRole(ROLES.CLIENT)];
const staffOnly = [verifyToken, requireRole(...STAFF_ROLES)];

// GET /api/clients/me - Vérification de session (route protégée)
router.get("/me", clientOnly, getMe);

// POST /api/clients/logout - Déconnexion
router.post("/logout", logout)

// POST /api/clients/register - Inscription (limitée contre la force brute)
router.post("/register", authLimiter, register);

// POST /api/clients/activate - Activation d'un compte créé en boutique
router.post("/activate", authLimiter, activate);

// POST /api/clients/login - Connexion (token JWT dans un cookie HttpOnly)
router.post("/login", authLimiter, login);

// POST /api/clients/forgot-password - Lien de réinitialisation par email
router.post("/forgot-password", authLimiter, forgotPassword);

// POST /api/clients/reset-password - Nouveau mot de passe via le lien reçu
router.post("/reset-password", authLimiter, resetPassword);

// PUT /api/clients/me - Modification du profil
router.put("/me", clientOnly, updateProfile);

// PUT /api/clients/me/password - Changement de mot de passe
router.put("/me/password", clientOnly, changePassword);

// Gestion des clients en magasin (vendeur ou administrateur)
// Les routes /me sont déclarées AVANT /:id pour ne pas être confondues avec un identifiant
// GET /api/clients?search=... - Rechercher un client
router.get("/", staffOnly, search);

// POST /api/clients - Créer une fiche client sans mot de passe
router.post("/", staffOnly, createInStore);

// GET /api/clients/:id - Fiche client complète (historique + statistiques)
router.get("/:id", staffOnly, getClientDetails);

module.exports = router;
