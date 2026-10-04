// chemin : /api/clients

const express = require('express'); // Les deux const sont des bibliothèques, pas des fonctions donc on appelle à chaque fois
const {
    register,
    activate,
    login,
    getMe,
    logout,
    updateProfile,
    changePassword,
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

// Vérification de session du client
// Route protégée
// GET /api/clients/me
router.get("/me", clientOnly, getMe);

// Déconnexion
// POST /api/clients/logout
router.post("/logout", logout)

// Inscription d'un client (limitée contre la force brute)
// POST /api/clients/register
// Body : { nom, prenom, email, mdp, telephone }
router.post("/register", authLimiter, register);

// Activation d'un compte créé en boutique
// POST /api/clients/activate
// Body : { email, telephone, mdp }
router.post("/activate", authLimiter, activate);

// Connexion
// POST /api/clients/login
// Body : { email, mdp }
// Dépose le token JWT dans un cookie HttpOnly
router.post("/login", authLimiter, login);

// Modification du profil
// PUT /api/clients/me
router.put("/me", clientOnly, updateProfile);

// Changement de mot de passe
// PUT /api/clients/me/password
// Body : { ancienMdp, nouveauMdp }
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
