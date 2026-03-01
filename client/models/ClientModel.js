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
    const { nom, prenom, mdp, email, telephone } = clientData;
    const [result] = await db.query(
        "INSERT INTO client (nom_client, prenom_client, mdp, email, telephone) VALUES (?, ?, ?, ?, ?)",
        [nom, prenom, mdp, email, telephone || '']
    );
    return result;
};

// Mettre à jour les informations d'un client
const updateClient = async (id, data) => {
    const { nom, prenom, email, telephone } = data;
    const [result] = await db.query(
        "UPDATE client SET nom_client = ?, prenom_client = ?, email = ?, telephone = ? WHERE code_client = ?",
        [nom, prenom, email, telephone || '', id]
    );
    return result;
};

// Mettre à jour le mot de passe d'un client
const updatePassword = async (id, newHash) => {
    const [result] = await db.query(
        "UPDATE client SET mdp = ? WHERE code_client = ?",
        [newHash, id]
    );
    return result;
};


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




module.exports = { findClientByEmail, createClient, hashPassword, comparePassword, findClientById, updateClient, updatePassword };

