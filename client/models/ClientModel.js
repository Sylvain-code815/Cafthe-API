const db = require("../../db");

// Colonnes publiques d'un client : le mot de passe haché n'en fait JAMAIS partie
const PUBLIC_COLUMNS = "code_client, nom_client, prenom_client, email, telephone, num_employe_createur, created_at";

// Rechercher un client par son id (sans mot de passe)
const findClientById = async (id) => {
    const [rows] = await db.query(`SELECT ${PUBLIC_COLUMNS} FROM client WHERE code_client = ?`, [id]);
    return rows;
};

// Rechercher un client par email, AVEC l'empreinte du mot de passe
// À n'utiliser que pour l'authentification (ne jamais renvoyer ce résultat au front)
const findClientByEmail = async (email) => {
    const [rows] = await db.query("SELECT * FROM client WHERE email = ?", [email]);
    return rows;
};

// Récupérer l'empreinte du mot de passe d'un client (changement de mot de passe)
const findClientPasswordHash = async (id) => {
    const [rows] = await db.query("SELECT mdp FROM client WHERE code_client = ?", [id]);
    return rows[0]?.mdp;
};

// Créer un nouveau client
// mdp = null et num_employe_createur renseigné quand le client est créé en caisse par un vendeur
const createClient = async (clientData) => {
    const { nom, prenom, mdp = null, email, telephone, num_employe_createur = null } = clientData;
    const [result] = await db.query(
        `INSERT INTO client (nom_client, prenom_client, mdp, email, telephone, num_employe_createur)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [nom, prenom, mdp, email, telephone || '', num_employe_createur]
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

// Mettre à jour le mot de passe d'un client (changement ou activation d'un compte boutique)
const updatePassword = async (id, newHash) => {
    const [result] = await db.query(
        "UPDATE client SET mdp = ? WHERE code_client = ?",
        [newHash, id]
    );
    return result;
};

// Rechercher des clients par nom, prénom, email ou téléphone (vente en caisse)
const searchClients = async (search) => {
    const like = `%${search}%`;
    const [rows] = await db.query(
        `SELECT ${PUBLIC_COLUMNS}, (mdp IS NOT NULL) AS compte_actif
         FROM client
         WHERE nom_client LIKE ? OR prenom_client LIKE ? OR email LIKE ? OR telephone LIKE ?
         ORDER BY nom_client, prenom_client
         LIMIT 50`,
        [like, like, like, like]
    );
    return rows;
};

// Statistiques personnalisées d'un client (CDC 5.5) :
// nombre de commandes, panier moyen, montant total, dernier achat, produits favoris
const getClientStats = async (id) => {
    const [[stats]] = await db.query(
        `SELECT COUNT(*) AS nombre_commandes,
                COALESCE(ROUND(AVG(total), 2), 0) AS panier_moyen,
                COALESCE(SUM(total), 0) AS total_depense,
                MAX(date_commande) AS dernier_achat
         FROM commande
         WHERE code_client = ?`,
        [id]
    );

    const [favoris] = await db.query(
        `SELECT p.code_produit, p.nom_produit, SUM(l.quantite) AS quantite_totale
         FROM ligne_commande l
         JOIN commande c ON c.num_commande = l.num_commande
         JOIN produit p ON p.code_produit = l.code_produit
         WHERE c.code_client = ?
         GROUP BY p.code_produit, p.nom_produit
         ORDER BY quantite_totale DESC
         LIMIT 3`,
        [id]
    );

    return { ...stats, produits_favoris: favoris };
};

module.exports = {
    findClientByEmail,
    findClientById,
    findClientPasswordHash,
    createClient,
    updateClient,
    updatePassword,
    searchClients,
    getClientStats,
};
