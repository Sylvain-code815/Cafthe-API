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


module.exports = {getAllArticles}