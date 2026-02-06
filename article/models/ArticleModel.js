const db = require("../../db");

// Fonction pour récupérer tous les articles
const getAllArticles = async () => {
    const [rows] = await db.query("SELECT * FROM produit");
    return rows;
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

module.exports = {getAllArticles, getArticleById, getArticlesByCategory};