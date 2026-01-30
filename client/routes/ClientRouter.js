// chemin : /api/clients

const express = require('express'); // Les deux const sont des bibliothèques, pas des fonctions donc on appelle à chaque fois
const { register, login } = require("../controllers/ClientController");
const router = express.Router();

// Inscription d'un client
// POST /api/clients/register
// Body : { nom, prenom, email, mot_de_passe
router.post("/", register);

// Connexion
// POST /api/clients/login
// Body : { email, mot_de_passe }
// Retourne un token JWT
router.post("/login", login);

module.exports = router;