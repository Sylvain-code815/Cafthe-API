const db = require("../../db");

// Colonnes de tri autorisées (liste blanche) : ORDER BY ne peut pas utiliser de "?"
const SORT_COLUMNS = {
    price_asc: "prix_ttc ASC",
    price_desc: "prix_ttc DESC",
    name_asc: "nom_produit ASC",
    name_desc: "nom_produit DESC",
};

// filters : { category, search, minPrice, maxPrice, featured, onSale, sort, limit, offset }
const getAllArticles = async (filters = {}) => {
    const conditions = ["active = 1"];
    const params = [];

    if (filters.category) {
        conditions.push("categorie = ?");
        params.push(filters.category);
    }
    if (filters.search) {
        conditions.push("(nom_produit LIKE ? OR description LIKE ? OR sku LIKE ?)");
        params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
    }
    if (filters.minPrice !== undefined) {
        conditions.push("prix_ttc >= ?");
        params.push(filters.minPrice);
    }
    if (filters.maxPrice !== undefined) {
        conditions.push("prix_ttc <= ?");
        params.push(filters.maxPrice);
    }
    if (filters.featured) {
        conditions.push("produit_phare = 1");
    }
    if (filters.onSale) {
        conditions.push("produit_promotion = 1");
    }

    const where = `WHERE ${conditions.join(" AND ")}`;
    const orderBy = SORT_COLUMNS[filters.sort] || "code_produit ASC";

    // Nombre total de résultats (pagination)
    const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM produit ${where}`, params);

    let sql = `SELECT * FROM produit ${where} ORDER BY ${orderBy}`;
    const rowParams = [...params];
    if (filters.limit !== undefined) {
        sql += " LIMIT ? OFFSET ?";
        rowParams.push(filters.limit, filters.offset);
    }

    const [rows] = await db.query(sql, rowParams);
    return { rows, total };
};

// includeInactive : l'administrateur peut retrouver un produit désactivé
const getArticleById = async (id, includeInactive = false) => {
    const sql = includeInactive
        ? "SELECT * FROM produit WHERE code_produit = ?"
        : "SELECT * FROM produit WHERE code_produit = ? AND active = 1";
    const [rows] = await db.query(sql, [id]);
    return rows;
};

const createArticle = async (article) => {
    const [result] = await db.query(
        `INSERT INTO produit
            (sku, nom_produit, description, categorie, type_vente, tva, prix_ttc, prix_HT, stock,
             image, origine, produit_phare, nouveaute, produit_promotion, taux_remise)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            article.sku, article.nom_produit, article.description, article.categorie, article.type_vente,
            article.tva, article.prix_ttc, article.prix_HT, article.stock, article.image,
            article.origine, article.produit_phare, article.nouveaute, article.produit_promotion,
            article.taux_remise,
        ]
    );
    return result.insertId;
};

const updateArticle = async (id, article) => {
    const [result] = await db.query(
        `UPDATE produit SET
            sku = ?, nom_produit = ?, description = ?, categorie = ?, type_vente = ?, tva = ?, prix_ttc = ?,
            prix_HT = ?, stock = ?, image = ?, origine = ?, produit_phare = ?, nouveaute = ?,
            produit_promotion = ?, taux_remise = ?, active = ?
         WHERE code_produit = ?`,
        [
            article.sku, article.nom_produit, article.description, article.categorie, article.type_vente,
            article.tva, article.prix_ttc, article.prix_HT, article.stock, article.image,
            article.origine, article.produit_phare, article.nouveaute, article.produit_promotion,
            article.taux_remise, article.active, id,
        ]
    );
    return result.affectedRows;
};

// Suppression logique : on garde l'historique des commandes
const deactivateArticle = async (id) => {
    const [result] = await db.query(
        "UPDATE produit SET active = 0 WHERE code_produit = ? AND active = 1",
        [id]
    );
    return result.affectedRows;
};

module.exports = {
    getAllArticles,
    getArticleById,
    createArticle,
    updateArticle,
    deactivateArticle,
    SORT_COLUMNS,
};
