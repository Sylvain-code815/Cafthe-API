// Création du token JWT et du cookie HttpOnly qui le transporte
const jwt = require("jsonwebtoken");

const COOKIE_NAME = "token";

// Durées de session (en secondes) :
// - personnel : 30 minutes (CDC 5.1 : timeout après 30 min d'inactivité)
// - client : JWT_EXPIRES_IN du .env, 1 heure par défaut
const STAFF_SESSION_SECONDS = 30 * 60;
const CLIENT_SESSION_SECONDS = parseInt(process.env.JWT_EXPIRES_IN, 10) || 3600;

// Le token ne contient que des données non sensibles : identifiant + rôle
const signToken = (payload, expiresInSeconds) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        algorithm: "HS256",
        expiresIn: expiresInSeconds,
    });
};

// Options du cookie :
// - httpOnly : inaccessible au JavaScript du navigateur (protection XSS)
// - secure : envoyé uniquement en HTTPS (activé en production)
// - sameSite strict : pas envoyé depuis un autre site (protection CSRF)
const cookieOptions = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
});

// Crée le token et le dépose dans un cookie qui expire en même temps que lui
const sendAuthCookie = (res, payload, sessionSeconds) => {
    const token = signToken(payload, sessionSeconds);
    res.cookie(COOKIE_NAME, token, { ...cookieOptions(), maxAge: sessionSeconds * 1000 });
};

const clearAuthCookie = (res) => {
    res.clearCookie(COOKIE_NAME, cookieOptions());
};

module.exports = {
    COOKIE_NAME,
    STAFF_SESSION_SECONDS,
    CLIENT_SESSION_SECONDS,
    signToken,
    sendAuthCookie,
    clearAuthCookie,
};
