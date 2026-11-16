// Middleware "Le Vigile" : protège les routes privées
const jwt = require("jsonwebtoken");
const { COOKIE_NAME } = require("../utils/authToken");

// Vérifie que la requête porte un token JWT valide
const verifyToken = (req, res, next) => {
    // Token dans le cookie HttpOnly ou l'en-tête Authorization: Bearer
    let token = req.cookies?.[COOKIE_NAME]; // ?. : pas de crash si aucun cookie

    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        }
    }

    if (!token) {
        return res.status(401).json({ message: "Accès refusé. Token manquant." });
    }

    // Signature vérifiée, algorithme imposé (refuse un token forgé avec "alg: none")
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });

        // Identité injectée dans la requête
        req.user = { id: decoded.id, role: decoded.role };
        next(); // Passe au contrôleur suivant
    } catch (err) {
        // 401 : l'identité n'est pas prouvée (token expiré, modifié ou mal formé)
        return res.status(401).json({ message: "Token invalide ou expiré." });
    }
};

// Vérifie que l'utilisateur connecté possède l'un des rôles autorisés
// À placer APRÈS verifyToken. Exemple : requireRole(ROLES.ADMIN)
const requireRole = (...allowedRoles) => (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
        // 403 : l'identité est connue mais les droits sont insuffisants
        return res.status(403).json({ message: "Accès interdit : droits insuffisants" });
    }
    next();
};

module.exports = { verifyToken, requireRole };
