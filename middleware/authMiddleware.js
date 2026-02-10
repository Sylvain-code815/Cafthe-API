// Middleware d'authentification JWT, c'est pour bloquer les routes qu'on ne veut pas montrer (sécu)
// Vérifie que le token JWT

const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    // 1. Récupérer le token (Cookie OU Header)
    let token = req.cookies?.token; // Utilise l'opérateur optionnel (?.) pour éviter le crash

    if (!token) {
        const authHeader = req.headers["authorization"];
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        }
    }

    // 2. Si toujours pas de token
    if (!token) {
        return res.status(401).json({ message: "Accès refusé. Token manquant." });
    }

    // 3. Vérification
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.client = decoded;
        next(); // Passe au controller suivant
    } catch (err) {
        return res.status(403).json({ message: "Token invalide ou expiré." });
    }
};

module.exports = { verifyToken };