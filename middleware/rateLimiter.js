// Limitation du nombre de tentatives sur les routes d'authentification
// Protège contre les attaques par force brute sur les mots de passe
const { rateLimit } = require("express-rate-limit");

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // fenêtre de 15 minutes
    limit: 10,                // 10 tentatives max par adresse IP
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Trop de tentatives, réessayez dans 15 minutes" },
    // Désactivé pendant les tests automatisés (sinon les tests se bloqueraient eux-mêmes)
    skip: () => process.env.NODE_ENV === "test",
});

module.exports = { authLimiter };
