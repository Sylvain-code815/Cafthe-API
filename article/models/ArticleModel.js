const db = require("../../db");

// Fonction pour récupérer tous les articles
const getAllArticles = async () => {
    const [rows] = await db.query("SELECT * FROM produit");
    let articlesRuntime = rows;
    return articlesRuntime;
};

// Récupérer un article par son ID
const getArticleById = async (id) => {
    const [rows] = await db.query("SELECT * FROM produit WHERE code_produit = ?", [id]);
    return rows;
};

// Récupérer un article par sa catégorie
const getArticlesByCategory = async (categorie) => {
    const [rows] = await db.query("SELECT * FROM produit WHERE categorie = ?", [categorie]);
    return rows;
};

// Récupérer un article uniquement en promotion
const getPromoArticles = async () => {
    const [rows] = await db.query("SELECT * FROM produit WHERE produit_promotion = 1");
    return rows;
};

// Récupérer les produits phares
const getPhareArticles = async () => {
    const [rows] = await db.query("SELECT * FROM produit WHERE produit_phare = 1");
    return rows;
};

module.exports = {getAllArticles, getArticleById, getArticlesByCategory, getPromoArticles, getPhareArticles};