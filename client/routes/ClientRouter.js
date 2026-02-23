// chemin : /api/clients

const express = require('express'); // Les deux const sont des bibliothèques, pas des fonctions donc on appelle à chaque fois
const { register, login, getMe, logout} = require("../controllers/ClientController");
const {verifyToken} = require("../../middleware/authMiddleware");
const router = express.Router();

// Vérification de session du client
// Route protégée
// GET /api/clients/me
router.get("/me", verifyToken, getMe);

// Déconnexion
// Route protégée
// POST /api/clients/logout
router.post("/logout", logout)

// Inscription d'un client
// POST /api/clients/register
// Body : { nom, prenom, email, mot_de_passe }
router.post("/register", register);

// Connexion
// POST /api/clients/login
// Body : { email, mot_de_passe }
// Retourne un token JWT
router.post("/login", login);

// Modification (update


module.exports = router;