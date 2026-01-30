// Middleware d'authentification JWT, c'est pour bloquer les routes qu'on ne veut pas montrer (sécu)
// Vérifie que le token JWT

const jwt = require("jsonwebtoken");

// Vérification du token
const verifyToken = (req, res, next) => {
    // Récupération du header d'Authorization
    const authHeader = req.headers["authorization"]

    if (!authHeader) {
        return res.status(403).json({
            message: "Token manquant",
        });
    }

    // Le format attendu, c'est "Bearer <token>"
    const parts = authHeader.split(" "); // ça veut dire tu coupes la chaîne de caractères en deux, véirification si le Bearer est mis par la personne entre les deux
    if (parts.length !== 2 || parts[0] !== "Bearer") {
        return res.status(403).json({ // code forbidden
            message: "Format de token invalid",
        });
    }

    const token = parts[1]; // Partie token de la chaîne de caractère

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