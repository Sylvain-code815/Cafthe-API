// Hachage et vérification des mots de passe (bcryptjs)
// Partagé par les clients et les employés (principe DRY)
const bcrypt = require("bcryptjs");

// Coût du hachage : 2^10 itérations par défaut (bon compromis sécurité / temps de réponse)
const SALT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS, 10) || 10;

// Empreinte factice : comparée quand le compte n'existe pas, pour que la réponse
// prenne le même temps (sinon on pourrait deviner quels emails ont un compte)
const DUMMY_HASH = "$2b$10$RV4TjqKvG0g33FPPBy6G5OOZ5twwGDMgqclOk8yqsQVuHKWqhpBI.";

const PASSWORD_RULE = "Le mot de passe doit contenir au moins 12 caractères, dont une majuscule, une minuscule, un chiffre et un caractère spécial";

// Le mot de passe n'est jamais stocké en clair : bcrypt ajoute un sel aléatoire
const hashPassword = (plainPassword) => bcrypt.hash(plainPassword, SALT_ROUNDS);

// Compare un mot de passe avec une empreinte (qui peut être absente)
// Renvoie false si l'empreinte est absente, après le même temps de calcul
const verifyPassword = async (plainPassword, hash) => {
    const isValid = await bcrypt.compare(plainPassword, hash || DUMMY_HASH);
    return Boolean(hash) && isValid;
};

// Une empreinte bcrypt commence par $2a$, $2b$ ou $2y$
const isBcryptHash = (value) => typeof value === "string" && /^\$2[aby]\$\d{2}\$/.test(value);

module.exports = { PASSWORD_RULE, hashPassword, verifyPassword, isBcryptHash };
