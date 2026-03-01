const db = require("../../db");

// Récupérer les adresses d'un client
const getAdressesByClient = async (clientId) => {
    const [rows] = await db.query("SELECT * FROM adresse WHERE code_client = ?", [clientId]);
    return rows;
};

// Créer une adresse
const createAdresse = async (data) => {
    const { code_client, titre, rue, cp, ville, pays } = data;
    const [result] = await db.query(
        "INSERT INTO adresse (code_client, titre, rue, cp, ville, pays) VALUES (?, ?, ?, ?, ?, ?)",
        [code_client, titre, rue, cp, ville, pays || 'France']
    );
    return result;
};

// Mettre à jour une adresse
const updateAdresse = async (id, data) => {
    const { titre, rue, cp, ville, pays } = data;
    const [result] = await db.query(
        "UPDATE adresse SET titre = ?, rue = ?, cp = ?, ville = ?, pays = ? WHERE id_adresse = ?",
        [titre, rue, cp, ville, pays || 'France', id]
    );
    return result;
};

// Supprimer une adresse
const deleteAdresse = async (id) => {
    const [result] = await db.query("DELETE FROM adresse WHERE id_adresse = ?", [id]);
    return result;
};

// Récupérer une adresse par son id
const getAdresseById = async (id) => {
    const [rows] = await db.query("SELECT * FROM adresse WHERE id_adresse = ?", [id]);
    return rows;
};

module.exports = { getAdressesByClient, createAdresse, updateAdresse, deleteAdresse, getAdresseById };
