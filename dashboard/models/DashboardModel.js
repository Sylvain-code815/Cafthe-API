const db = require("../../db");

// Indicateurs clés de performance du tableau de bord (CDC 5.6)
// Les calculs (sommes, moyennes, regroupements) sont faits par MySQL :
// seules les données agrégées transitent entre la BDD et l'API

// Chiffre d'affaires du jour, de la semaine, du mois et de l'année en cours
const getRevenue = async () => {
    const [[revenue]] = await db.query(
        `SELECT
            COALESCE(SUM(CASE WHEN DATE(date_commande) = CURDATE() THEN total END), 0) AS jour,
            COALESCE(SUM(CASE WHEN YEARWEEK(date_commande, 1) = YEARWEEK(CURDATE(), 1) THEN total END), 0) AS semaine,
            COALESCE(SUM(CASE WHEN YEAR(date_commande) = YEAR(CURDATE())
                               AND MONTH(date_commande) = MONTH(CURDATE()) THEN total END), 0) AS mois,
            COALESCE(SUM(CASE WHEN YEAR(date_commande) = YEAR(CURDATE()) THEN total END), 0) AS annee
         FROM commande`
    );
    return revenue;
};

// Nombre de ventes et panier moyen (toutes périodes, magasin + web)
const getSalesSummary = async () => {
    const [[summary]] = await db.query(
        `SELECT COUNT(*) AS nombre_ventes, COALESCE(ROUND(AVG(total), 2), 0) AS panier_moyen
         FROM commande`
    );
    return summary;
};

// Top 10 des produits les plus vendus (en quantité)
const getTopProducts = async () => {
    const [rows] = await db.query(
        `SELECT p.code_produit, p.nom_produit, p.categorie,
                SUM(l.quantite) AS quantite_vendue,
                SUM(l.quantite * l.prix_unitaire_achete) AS chiffre_affaires
         FROM ligne_commande l
         JOIN produit p ON p.code_produit = l.code_produit
         GROUP BY p.code_produit, p.nom_produit, p.categorie
         ORDER BY quantite_vendue DESC
         LIMIT 10`
    );
    return rows;
};

// Répartition des ventes par catégorie
const getSalesByCategory = async () => {
    const [rows] = await db.query(
        `SELECT p.categorie,
                SUM(l.quantite) AS quantite_vendue,
                SUM(l.quantite * l.prix_unitaire_achete) AS chiffre_affaires
         FROM ligne_commande l
         JOIN produit p ON p.code_produit = l.code_produit
         GROUP BY p.categorie
         ORDER BY chiffre_affaires DESC`
    );
    return rows;
};

// Évolution du nombre de nouveaux clients sur les 12 derniers mois
const getNewClientsByMonth = async () => {
    const [rows] = await db.query(
        `SELECT DATE_FORMAT(created_at, '%Y-%m') AS mois, COUNT(*) AS nouveaux_clients
         FROM client
         WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
         GROUP BY DATE_FORMAT(created_at, '%Y-%m')
         ORDER BY mois`
    );
    return rows;
};

module.exports = {
    getRevenue,
    getSalesSummary,
    getTopProducts,
    getSalesByCategory,
    getNewClientsByMonth,
};
