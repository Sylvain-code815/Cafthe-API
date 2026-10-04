// Fonctions de validation des entrées utilisateur
// Règle : on ne fait JAMAIS confiance aux données envoyées par le client,
// même si le front les a déjà vérifiées (un attaquant peut appeler l'API directement)

const MAX_INT = 2147483647; // Valeur max d'une colonne INT MySQL

// Convertit un identifiant d'URL ("5") en entier, ou renvoie null s'il est invalide
// Refuse "5abc", "-1", "1.5", "1 OR 1=1"... (parseInt seul accepterait "5abc")
const parseId = (value) => {
    if (typeof value !== "string" && typeof value !== "number") return null;
    if (!/^\d+$/.test(String(value))) return null;

    const id = Number(value);
    return id > 0 && id <= MAX_INT ? id : null;
};

// Entier compris entre min et max (quantité, stock, remise...)
const isIntInRange = (value, min, max) => {
    return Number.isInteger(value) && value >= min && value <= max;
};

// Identifiant envoyé dans un corps JSON (nombre entier positif)
const isValidId = (value) => isIntInRange(value, 1, MAX_INT);

// Chaîne non vide (après suppression des espaces) et de longueur maximale donnée
const isNonEmptyString = (value, maxLength) => {
    return typeof value === "string"
        && value.trim().length > 0
        && value.trim().length <= maxLength;
};

const isValidEmail = (value) => {
    return typeof value === "string"
        && value.length <= 250
        && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
};

// Normalise un email : sans espaces et en minuscules (évite les doublons Marie@... / marie@...)
const normalizeEmail = (email) => (typeof email === "string" ? email.trim().toLowerCase() : email);

// Recommandation CNIL : 12 caractères minimum avec majuscule, minuscule,
// chiffre et caractère spécial
const isStrongPassword = (value) => {
    return typeof value === "string"
        && value.length >= 12
        && value.length <= 72 // bcrypt ignore tout ce qui dépasse 72 octets
        && /[a-z]/.test(value)
        && /[A-Z]/.test(value)
        && /\d/.test(value)
        && /[^A-Za-z0-9]/.test(value);
};

// Numéro français à 10 chiffres
const isValidPhone = (value) => {
    return typeof value === "string" && /^0\d{9}$/.test(value);
};

// Code postal (international : lettres, chiffres, espace, tiret)
const isValidPostalCode = (value) => {
    return typeof value === "string" && /^[A-Za-z0-9 -]{3,10}$/.test(value);
};

// Prix positif avec au plus 2 décimales
const isValidPrice = (value) => {
    return typeof value === "number"
        && Number.isFinite(value)
        && value >= 0
        && value < 100000000
        // Tolérance : en JavaScript 17.06 * 100 vaut 1705.9999999999998
        && Math.abs(value * 100 - Math.round(value * 100)) < 1e-6;
};

// Supprime les accents et met en minuscules : "Thé" -> "the", "Café" -> "cafe"
const normalizeText = (value) => value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// Regroupe les erreurs de validation dans une réponse lisible par le front
// (le front affiche data.message)
const validationError = (res, errors) => {
    return res.status(400).json({ message: errors.join(". "), errors });
};

module.exports = {
    parseId,
    isIntInRange,
    isValidId,
    isNonEmptyString,
    isValidEmail,
    normalizeEmail,
    isStrongPassword,
    isValidPhone,
    isValidPostalCode,
    isValidPrice,
    normalizeText,
    validationError,
};
