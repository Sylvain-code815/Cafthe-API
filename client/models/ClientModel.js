const db = require("../../db");
const bcrypt = require("bcryptjs");

// Rechercher un client par son id
const findClientById = async (id) => {
    const [rows] = await db.query("SELECT * FROM client WHERE code_client = ?", [id]);
    return rows;
};

// Rechercher un client par email
const findClientByEmail = async (email) => {
    // CORRECTION : Table 'client' (singulier) et colonne 'email' (pas email_client)
    const [rows] = await db.query("SELECT * FROM client WHERE email = ?", [email]);
    return rows;
};

// Créer un nouveau client
const createClient = async (clientData) => {
    // On extrait les données
    const { nom, prenom, mdp, email, telephone, adresse_livraison, cp_livraison, ville_livraison, adresse_facturation, cp_facturation, ville_facturation } = clientData;

    // CORRECTION SQL :
    // 1. Table 'client' (singulier)
    // 2. Colonnes : nom_client, prenom_client, email, mdp... (selon ton SQL initial)
    // 3. J'ai aligné le nombre de points d'interrogation (?) avec le nombre de colonnes
    const [result] = await db.query(
        "INSERT INTO client (nom_client, prenom_client, mdp, email, telephone, adresse_livraison, cp_livraison, ville_livraison, adresse_facturation, cp_facturation, ville_facturation) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
            nom,
            prenom,
            mdp,
            email,
            telephone || '',
            adresse_livraison || '',
            cp_livraison || '',
            ville_livraison || '',
            adresse_facturation || '',
            cp_facturation || '',
            ville_facturation || ''
        ]
    );
    return result;
};


// TODO : Mettre à jour les informations clients (voir créer client)

// Changement de mot de passe
// TODO : Taper l'ancien mot de passe, confirmer, button pour envoyer, nouveau mdp, envoi à l'API pour vérifier la conformité + comparaison avec l'ancine, confirmation, envoyer


// Hacher un mot de passe
const hashPassword = async (password) => {
    // CORRECTION : Variable 'rounds' (avec s)
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || 10);
    return await bcrypt.hash(password, rounds);
};

// Comparer un mot de passe
const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};




module.exports = { findClientByEmail, createClient, hashPassword, comparePassword, findClientById };

