// Les données passent par le controller, qui les envoient à l'utilisateur
const {getAllArticles, getArticleById, getArticlesByCategory} = require("../models/ArticleModel");

// Récupérer tous les articles


const getAll = async (req, res) => {
    try {
        const articles = await getAllArticles();

        res.json({
            message: "Articles récupés avec succès",
            count: articles.length,
            articles,
        })
    } catch (error) {
        console.error("Erreur de récupération des articles", error.message)
        res.status(500).json({
            message: "Erreur de récupération des articles",
        });
    }
};


// Récupérer un article par son id
const getById = async (id) => {
    try {
        // const id = req.params.id
        const {id} = req.params
        const articleId = parseInt(id);

        const articles = await getArticleById(articleId);

        if (articles.length == 0) {
            return res.status(404).json({
                message: "Article non trouvé"
            });
        }

        res.json({
            message: "Article récupéré avec succès",
            article: articles[0]
        })

    } catch (error) {
        console.error("Erreur de récupération de l'article", error.message);
        res.status(500).json({
          message: "Erreur de récupération de l'article",
        });
    }
};

// Récupérer les produits par catégorie
const getByCategorie = async (req, res) => {
    try {
        const { category } = req.params;
        const articles = await getArticlesByCategory(category);

        res.json({
            message: `Articles de la catégorie ${category}`,
            count: articles.length,
            articles,
        })

    } catch (error) {
        console.error("Erreur de récupération par catégorie", error.message);
        res.status(500).json({
            message: `Erreur de récupération des articles de la catégorie ${category}`,
        });
    }
}

module.exports = {getAll};

// const { getAllArticles, getArticleById } = require("../models/ArticleModel");
//
// // 1. Récupérer tous les articles
// const getAll = async (req, res) => {
//     try {
//         const articles = await getAllArticles();
//         res.json({
//             message: "Articles récupérés avec succès",
//             count: articles.length,
//             articles,
//         });
//     } catch (error) {
//         console.error("Erreur getAll :", error.message);
//         res.status(500).json({ message: "Erreur serveur" });
//     }
// };
//
// // 2. Récupérer un article par son ID
// // CORRECTION : On doit mettre (req, res), pas (id) !
// const getById = async (req, res) => {
//     try {
//         // On récupère l'id depuis l'URL (ex: /api/articles/4)
//         const { id } = req.params;
//
//         // On appelle le modèle
//         const articles = await getArticleById(id);
//
//         // Si le tableau est vide, l'article n'existe pas
//         if (articles.length === 0) {
//             return res.status(404).json({
//                 message: "Article introuvable"
//             });
//         }
//
//         // Sinon, on renvoie le premier élément du tableau (l'article)
//         res.json({
//             message: "Article récupéré",
//             article: articles[0]
//         });
//
//     } catch (error) {
//         console.error("Erreur getById :", error.message);
//         res.status(500).json({ message: "Erreur serveur" });
//     }
// };
//
// // CORRECTION : Ne pas oublier d'exporter la nouvelle fonction !
// module.exports = { getAll, getById };