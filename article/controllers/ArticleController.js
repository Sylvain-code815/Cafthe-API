// Les données passent par le controller, qui les envoient à l'utilisateur
const {getAllArticles, getArticleById} = require("../models/ArticleModel");

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

module.exports = {getAll};