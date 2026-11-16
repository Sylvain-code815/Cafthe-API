// Limitation des tentatives sur les routes d'authentification (force brute)
const { rateLimit } = require("express-rate-limit");

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 10,                // 10 tentatives max par adresse IP
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { message: "Trop de tentatives, réessayez dans 15 minutes" },
    // Désactivé pendant les tests automatisés (sinon les tests se bloqueraient eux-mêmes)
    skip: () => process.env.NODE_ENV === "test",
});

module.exports = { authLimiter };
