// Les données passent par le controller, qui les envoient à l'utilisateur
const {
    getAllArticles,
    getArticleById,
    createArticle,
    updateArticle,
    deactivateArticle,
    SORT_COLUMNS,
} = require("../models/ArticleModel");
const { VAT_BY_CATEGORY } = require("../../config/constants");
const { roundPrice } = require("../../utils/pricing");
const {
    parseId,
    isIntInRange,
    isNonEmptyString,
    isValidPrice,
    normalizeText,
    validationError,
} = require("../../utils/validators");

const MAX_PAGE_SIZE = 50;
const CATEGORIES = Object.keys(VAT_BY_CATEGORY);

// Retrouve la catégorie officielle sans tenir compte des accents ni des majuscules
// ("the" -> "Thé", "Cafe" -> "Café"), ou renvoie null si elle n'existe pas
const findCategory = (value) => {
    if (typeof value !== "string") return null;
    return CATEGORIES.find((category) => normalizeText(category) === normalizeText(value)) || null;
};

// Lit et valide les filtres de la query string (?category=Thé&sort=price_asc&page=2)
// Renvoie { error } si un filtre est invalide, sinon { filters }
const parseCatalogFilters = (query) => {
    const filters = {};

    if (query.category !== undefined) {
        filters.category = findCategory(query.category);
        if (!filters.category) {
            return { error: `Catégorie inconnue (${CATEGORIES.join(", ")})` };
        }
    }
    if (query.search !== undefined) {
        if (!isNonEmptyString(query.search, 100)) {
            return { error: "Recherche invalide (100 caractères maximum)" };
        }
        filters.search = query.search.trim();
    }
    for (const key of ["minPrice", "maxPrice"]) {
        if (query[key] !== undefined) {
            const price = Number(query[key]);
            if (query[key] === "" || !Number.isFinite(price) || price < 0) {
                return { error: `Le filtre ${key} doit être un nombre positif` };
            }
            filters[key] = price;
        }
    }
    if (query.sort !== undefined) {
        if (!Object.hasOwn(SORT_COLUMNS, query.sort)) {
            return { error: `Tri invalide (valeurs possibles : ${Object.keys(SORT_COLUMNS).join(", ")})` };
        }
        filters.sort = query.sort;
    }
    filters.featured = query.featured === "true";
    filters.onSale = query.onSale === "true";

    // Pagination facultative : sans ?page, tout le catalogue est renvoyé
    if (query.page !== undefined || query.limit !== undefined) {
        const page = query.page === undefined ? 1 : parseId(query.page);
        const limit = query.limit === undefined ? 12 : parseId(query.limit);
        if (!page || !limit || limit > MAX_PAGE_SIZE) {
            return { error: `Pagination invalide (page >= 1, limit entre 1 et ${MAX_PAGE_SIZE})` };
        }
        filters.page = page;
        filters.limit = limit;
        filters.offset = (page - 1) * limit;
    }

    return { filters };
};

// Valide les données d'un article et calcule les champs dérivés
// (TVA selon la catégorie, prix TTC à partir du prix HT)
// Seuls les champs connus sont recopiés : impossible d'imposer un prix TTC ou un id
// Renvoie { errors } ou { article }
const buildArticle = (input) => {
    const errors = [];
    const categorie = findCategory(input.categorie);

    if (!isNonEmptyString(input.nom_produit, 50)) errors.push("nom_produit obligatoire (50 caractères max)");
    if (!isNonEmptyString(input.description, 255)) errors.push("description obligatoire (255 caractères max)");
    if (!categorie) errors.push(`categorie obligatoire (${CATEGORIES.join(", ")})`);
    if (!isNonEmptyString(input.type_vente, 20)) errors.push("type_vente obligatoire (20 caractères max)");
    if (!isValidPrice(input.prix_HT)) errors.push("prix_HT doit être un nombre positif (2 décimales max)");
    if (!isIntInRange(input.stock, 0, 1000000)) errors.push("stock doit être un entier positif");
    if (!isNonEmptyString(input.origine, 100)) errors.push("origine obligatoire (100 caractères max)");
    if (typeof input.image !== "string" || input.image.length > 150) errors.push("image : 150 caractères max");
    if (!isIntInRange(input.taux_remise, 0, 90)) errors.push("taux_remise doit être un entier entre 0 et 90");
    for (const flag of ["produit_phare", "nouveaute", "produit_promotion", "active"]) {
        if (typeof input[flag] !== "boolean") errors.push(`${flag} doit être un booléen`);
    }

    if (errors.length > 0) return { errors };

    const tva = VAT_BY_CATEGORY[categorie];
    return {
        article: {
            nom_produit: input.nom_produit.trim(),
            description: input.description.trim(),
            categorie,
            type_vente: input.type_vente.trim(),
            tva,
            prix_HT: input.prix_HT,
            // Donnée calculée (dictionnaire de données) : prix_HT * (1 + tva/100)
            prix_ttc: roundPrice(input.prix_HT * (1 + tva / 100)),
            stock: input.stock,
            image: input.image.trim(),
            origine: input.origine.trim(),
            produit_phare: input.produit_phare,
            nouveaute: input.nouveaute,
            produit_promotion: input.produit_promotion,
            taux_remise: input.taux_remise,
            active: input.active,
        },
    };
};

// Réponse commune aux listes d'articles
const sendArticleList = async (res, filters, message) => {
    try {
        const { rows: articles, total } = await getAllArticles(filters);

        const response = {
            message,
            count: articles.length,
            total,
            articles,
        };
        if (filters.page) {
            response.page = filters.page;
            response.totalPages = Math.ceil(total / filters.limit);
        }
        res.json(response);
    } catch (error) {
        console.error("Erreur de récupération des articles", error.message)
        res.status(500).json({
            message: "Erreur de récupération des articles",
        });
    }
};

// Récupérer tous les articles (filtres, tri et pagination facultatifs)
const getAll = async (req, res) => {
    const { filters, error } = parseCatalogFilters(req.query);
    if (error) {
        return res.status(400).json({ message: error });
    }
    await sendArticleList(res, filters, "Articles récupérés avec succès");
};

// Récupérer les produits par catégorie
const getByCategorie = async (req, res) => {
    const category = findCategory(req.params.categorie);
    if (!category) {
        return res.status(400).json({ message: `Catégorie inconnue (${CATEGORIES.join(", ")})` });
    }
    await sendArticleList(res, { category }, `Articles de la catégorie ${category}`);
};

// Récupérer les articles en promotion
const getPromo = async (req, res) => {
    await sendArticleList(res, { onSale: true }, "Articles en promotion récupérés avec succès");
};

// Récupérer les produits phares
const getPhare = async (req, res) => {
    await sendArticleList(res, { featured: true }, "Produits phares récupérés avec succès");
};

// Récupérer un article par son id
const getById = async (req, res) => {
    // parseId refuse "5abc" ou "1 OR 1=1" (parseInt aurait accepté "5abc")
    const articleId = parseId(req.params.id);
    if (!articleId) {
        return res.status(400).json({ message: "Identifiant d'article invalide" });
    }

    try {
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

// Créer un article (administrateur)
const create = async (req, res) => {
    // Valeurs par défaut des champs facultatifs
    const { article, errors } = buildArticle({
        stock: 0,
        image: "",
        produit_phare: false,
        nouveaute: false,
        produit_promotion: false,
        taux_remise: 0,
        ...(req.body || {}),
        active: true,
    });
    if (errors) {
        return validationError(res, errors);
    }

    try {
        const id = await createArticle(article);
        res.status(201).json({
            message: "Article créé avec succès",
            article: { code_produit: id, ...article },
        });
    } catch (error) {
        console.error("Erreur de création de l'article", error.message);
        res.status(500).json({ message: "Erreur de création de l'article" });
    }
};

// Mettre à jour un article (administrateur)
// Seuls les champs envoyés sont modifiés, les autres gardent leur valeur actuelle
const update = async (req, res) => {
    const articleId = parseId(req.params.id);
    if (!articleId) {
        return res.status(400).json({ message: "Identifiant d'article invalide" });
    }

    try {
        const existing = await getArticleById(articleId, true);
        if (existing.length === 0) {
            return res.status(404).json({ message: "Article non trouvé" });
        }

        const current = existing[0];
        const { article, errors } = buildArticle({
            ...current,
            // MySQL renvoie les DECIMAL en texte et les BOOLEAN en 0/1
            prix_HT: Number(current.prix_HT),
            produit_phare: Boolean(current.produit_phare),
            nouveaute: Boolean(current.nouveaute),
            produit_promotion: Boolean(current.produit_promotion),
            active: Boolean(current.active),
            ...(req.body || {}),
        });
        if (errors) {
            return validationError(res, errors);
        }

        await updateArticle(articleId, article);
        res.json({
            message: "Article mis à jour avec succès",
            article: { code_produit: articleId, ...article },
        });
    } catch (error) {
        console.error("Erreur de mise à jour de l'article", error.message);
        res.status(500).json({ message: "Erreur de mise à jour de l'article" });
    }
};

// Supprimer un article (administrateur) : désactivation logique
const remove = async (req, res) => {
    const articleId = parseId(req.params.id);
    if (!articleId) {
        return res.status(400).json({ message: "Identifiant d'article invalide" });
    }

    try {
        const affectedRows = await deactivateArticle(articleId);
        if (affectedRows === 0) {
            return res.status(404).json({ message: "Article non trouvé" });
        }
        res.json({ message: "Article retiré du catalogue (historique conservé)" });
    } catch (error) {
        console.error("Erreur de suppression de l'article", error.message);
        res.status(500).json({ message: "Erreur de suppression de l'article" });
    }
};

module.exports = { getAll, getById, getByCategorie, getPromo, getPhare, create, update, remove };
