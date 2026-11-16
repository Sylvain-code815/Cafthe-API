// Jetons de réinitialisation de mot de passe (table password_reset)
// Seule l'empreinte SHA-256 du jeton est stockée : une fuite de la table est sans danger
const crypto = require("crypto");
const db = require("../../db");

// Durée de validité du lien : 1 heure
const RESET_TOKEN_MINUTES = 60;

// Jeton aléatoire de 64 caractères hexadécimaux (32 octets)
const generateToken = () => crypto.randomBytes(32).toString("hex");

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// Crée un jeton pour un compte ('client' ou 'employee') et renvoie le jeton en clair
// Les anciens jetons non utilisés de ce compte sont annulés : seul le dernier lien fonctionne
const createResetToken = async (accountType, accountId) => {
    const token = generateToken();
    await db.query(
        "UPDATE password_reset SET used_at = NOW() WHERE account_type = ? AND account_id = ? AND used_at IS NULL",
        [accountType, accountId]
    );
    await db.query(
        `INSERT INTO password_reset (account_type, account_id, token_hash, expires_at)
         VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
        [accountType, accountId, hashToken(token), RESET_TOKEN_MINUTES]
    );
    return token;
};

// Cherche un jeton encore valable (ni expiré, ni déjà utilisé) ; renvoie la ligne ou undefined
const findValidToken = async (accountType, token) => {
    const [rows] = await db.query(
        `SELECT id, account_id FROM password_reset
         WHERE account_type = ? AND token_hash = ? AND used_at IS NULL AND expires_at > NOW()`,
        [accountType, hashToken(token)]
    );
    return rows[0];
};

// Marque le jeton comme utilisé : le lien ne fonctionne qu'une fois
const markTokenUsed = async (id) => {
    await db.query("UPDATE password_reset SET used_at = NOW() WHERE id = ?", [id]);
};

module.exports = { RESET_TOKEN_MINUTES, hashToken, createResetToken, findValidToken, markTokenUsed };
