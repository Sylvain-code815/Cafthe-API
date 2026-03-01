// Les données passent par le controller, qui les envoient à l'utilisateur
const {getAllArticles, getArticleById, getArticlesByCategory, getPromoArticles, getPhareArticles} = require("../models/ArticleModel");

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
const getById = async (req, res) => {
    try {
        // const id = req.params.id
        const {id} = req.params
        const articleId = parseInt(id);

        const articles = await getArticleById(articleId);

        if (articles.length === 0) {
            return res.status(404).json({
                message: "Article non trouvé"
            });
        }
// Sinon, on renvoie le premier élément du tableau (l'article)
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
        // 1. On récupère 'categorie' car dans le routeur tu as mis "/categorie/:categorie"
        const { categorie } = req.params;

        // 2. On passe cette variable au Modèle
        const articles = await getArticlesByCategory(categorie);

        res.json({
            message: `Articles de la catégorie ${categorie}`,
            count: articles.length,
            articles,
        })

    } catch (error) {
        console.error("Erreur de récupération par catégorie", error.message);
        res.status(500).json({
            message: "Erreur serveur lors de la récupération par catégorie",
        });
    }
}

// Récupérer les articles en promotion
const getPromo = async (req, res) => {
    try {
        const articles = await getPromoArticles();

        res.json({
            message: "Articles en promotion récupérés avec succès",
            count: articles.length,
            articles,
        })
    } catch (error) {
        console.error("Erreur de récupération des articles en promotion", error.message);
        res.status(500).json({
            message: "Erreur de récupération des articles en promotion",
        });
    }
};

// Récupérer les produits phares
const getPhare = async (req, res) => {
    try {
        const articles = await getPhareArticles();

        res.json({
            message: "Produits phares récupérés avec succès",
            count: articles.length,
            articles,
        })
    } catch (error) {
        console.error("Erreur de récupération des produits phares", error.message);
        res.status(500).json({
            message: "Erreur de récupération des produits phares",
        });
    }
};

module.exports = {getAll, getById, getByCategorie, getPromo, getPhare};