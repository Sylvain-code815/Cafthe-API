// Middleware "Le Vigile" : protège les routes privées
const jwt = require("jsonwebtoken");
const { COOKIE_NAME } = require("../utils/authToken");

// Vérifie que la requête porte un token JWT valide
const verifyToken = (req, res, next) => {
    // 1. Récupérer le token (Cookie HttpOnly OU en-tête Authorization: Bearer)
    let token = req.cookies?.[COOKIE_NAME]; // Opérateur optionnel (?.) pour éviter le crash

    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        }
    }

    // 2. Si toujours pas de token
    if (!token) {
        return res.status(401).json({ message: "Accès refusé. Token manquant." });
    }

    // 3. Vérification de la signature avec la clé secrète du serveur
    // (algorithme imposé pour refuser un token forgé avec "alg: none")
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });

        // Injection de l'identité dans la requête pour les contrôleurs
        req.user = { id: decoded.id, role: decoded.role };
        next(); // Passe au controller suivant
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
