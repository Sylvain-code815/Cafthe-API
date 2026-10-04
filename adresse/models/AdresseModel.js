const db = require("../../db");

// Carnet d'adresses : chaque requête de modification filtre sur code_client,
// un client ne peut donc jamais modifier ou supprimer l'adresse d'un autre

// Récupérer les adresses d'un client
const getAdressesByClient = async (clientId) => {
    const [rows] = await db.query(
        "SELECT id_adresse, titre, rue, cp, ville, pays FROM adresse WHERE code_client = ? ORDER BY id_adresse",
        [clientId]
    );
    return rows;
};

// Récupérer une adresse d'un client
const getAdresseById = async (id, clientId) => {
    const [rows] = await db.query(
        "SELECT id_adresse, titre, rue, cp, ville, pays FROM adresse WHERE id_adresse = ? AND code_client = ?",
        [id, clientId]
    );
    return rows;
};

// Créer une adresse
const createAdresse = async (data) => {
    const { code_client, titre, rue, cp, ville, pays } = data;
    const [result] = await db.query(
        "INSERT INTO adresse (code_client, titre, rue, cp, ville, pays) VALUES (?, ?, ?, ?, ?, ?)",
        [code_client, titre, rue, cp, ville, pays]
    );
    return result;
};

// Mettre à jour une adresse du client
const updateAdresse = async (id, clientId, data) => {
    const { titre, rue, cp, ville, pays } = data;
    const [result] = await db.query(
        "UPDATE adresse SET titre = ?, rue = ?, cp = ?, ville = ?, pays = ? WHERE id_adresse = ? AND code_client = ?",
        [titre, rue, cp, ville, pays, id, clientId]
    );
    return result;
};

// Une adresse utilisée par une commande (livraison ou facturation) est figée :
// la supprimer casserait l'historique des commandes
const isAdresseUsedByOrder = async (id) => {
    const [rows] = await db.query(
        "SELECT 1 FROM commande WHERE id_adresse_livraison = ? OR id_adresse_facturation = ? LIMIT 1",
        [id, id]
    );
    return rows.length > 0;
};

// Supprimer une adresse du client
const deleteAdresse = async (id, clientId) => {
    const [result] = await db.query(
        "DELETE FROM adresse WHERE id_adresse = ? AND code_client = ?",
        [id, clientId]
    );
    return result;
};

module.exports = {
    getAdressesByClient,
    getAdresseById,
    createAdresse,
    updateAdresse,
    isAdresseUsedByOrder,
    deleteAdresse,
};
