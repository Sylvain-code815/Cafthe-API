const db = require("../../db");
const bcrypt = require("bcryptjs");

// rechercher un client par email
const findClientByEmail = async (email) => {
    const [rows] = await db.query("SELECT * FROM clients WHERE email_client = ?", [email]);
    return rows;
};

// Créer un nouveau client
const createClient = async (clientData) => {
    const { nom, prenom, email, mot_de_passe, adresse_facturation, cp_facturation, adresse_livraison, cp_livraison, ville_livraison, telephone } = clientData;

    const [result] = await db.query(// reqête sql
        "INSERT INTO clients (nom_client, prenom_client, email_client, mdp_client, adresse_facturation, ville_facturation, adresse_livraison, ville_livraison, telephone_client) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", // ? = donnée à passer, les var d'au-dessus
        [nom, prenom, email, mot_de_passe, adresse_facturation || null, cp_facturation || null, adresse_livraison || null, cp_livraison || null, ville_livraison || null, telephone || null] // ça se sont les données que doit mettre le client de façon obligatoire pour s'inscrire
    );
    return result;
};

// Hacher un mot de passe : npm i bcrytjs
const hashPassword = async (password) => {
    const round = parseInt(process.env.BCRYPT_ROUNDS || 10);
    return await bcrypt.hash(password, rounds);
    // return await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS || 10)); Possibilité de le faire une une ligne
};

// Comparer un mot de passe
const comparePassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

module.exports = { findClientByEmail, createClient, hashPassword, comparePassword };