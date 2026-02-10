// Middleware d'authentification JWT, c'est pour bloquer les routes qu'on ne veut pas montrer (sécu)
// Vérifie que le token JWT

const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    // Cherche le token dans le cookie HttpOnly
    let token = req.cookies && req.cookies.token;

    // header Authorization
    if (!token) {
        const authHeader = req.headers["authorization"];

        if (!authHeader) {
            return res.status(403).json({ message: "Token manquant" });
        }

        const parts = authHeader.split(" ");

        if (parts.length !== 2 || parts[0] !== "Bearer") {
            return res.status(403).json({ message: "Format de token invalide" });
        }

        token = parts[1];
    }

    //Vérifier le token
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            if (err.name === "TokenExpiredError") {
                return res.status(401).json({
                    message: "Token expiré"
                })
            }
            return res.status(401).json({
                message: "Token invalide",
            });
        }

        // Token valide : on ajoute les infos du client à la requête
        req.client = decoded; // decoded = résultat du token décodé
        next();
    })
}

module.exports = { verifyToken };