// Tests d'intégration des routes /api/articles (Supertest)
// La base de données est remplacée par des fonctions simulées (mocks) :
// on teste le routeur, le vigile et le contrôleur sans dépendre de MySQL
jest.mock("../db", () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock("../article/models/ArticleModel", () => ({
    ...jest.requireActual("../article/models/ArticleModel"),
    getAllArticles: jest.fn(),
    getArticleById: jest.fn(),
    createArticle: jest.fn(),
    updateArticle: jest.fn(),
    deactivateArticle: jest.fn(),
}));

const request = require("supertest");
const app = require("../app");
const ArticleModel = require("../article/models/ArticleModel");
const { authHeader } = require("./helpers");

const validArticle = {
    nom_produit: "Thé Vert Sencha",
    description: "Thé vert japonais",
    categorie: "Thé",
    type_vente: "Boite",
    prix_HT: 17.06,
    origine: "Japon",
};

afterEach(() => jest.clearAllMocks());

describe("GET /api/articles", () => {
    test("200 avec la liste des articles (format attendu par le front)", async () => {
        ArticleModel.getAllArticles.mockResolvedValue({ rows: [{ code_produit: 1 }], total: 1 });

        const res = await request(app).get("/api/articles");

        expect(res.status).toBe(200);
        expect(res.body.count).toBe(1);
        expect(res.body.articles).toEqual([{ code_produit: 1 }]);
    });

    test("transmet les filtres et calcule la pagination", async () => {
        ArticleModel.getAllArticles.mockResolvedValue({ rows: [], total: 25 });

        const res = await request(app).get("/api/articles?category=Café&sort=price_asc&page=2&limit=10");

        expect(res.status).toBe(200);
        expect(res.body.totalPages).toBe(3);
        expect(ArticleModel.getAllArticles).toHaveBeenCalledWith(
            expect.objectContaining({ category: "Café", sort: "price_asc", limit: 10, offset: 10 })
        );
    });

    test("400 si le tri ne fait pas partie de la liste blanche (injection dans ORDER BY)", async () => {
        const res = await request(app).get("/api/articles?sort=prix_ttc;DROP TABLE produit");

        expect(res.status).toBe(400);
        expect(ArticleModel.getAllArticles).not.toHaveBeenCalled();
    });

    test("500 sans détail technique si la base de données échoue", async () => {
        ArticleModel.getAllArticles.mockRejectedValue(new Error("ECONNREFUSED 127.0.0.1:3306"));
        jest.spyOn(console, "error").mockImplementation(() => {});

        const res = await request(app).get("/api/articles");

        expect(res.status).toBe(500);
        expect(JSON.stringify(res.body)).not.toContain("ECONNREFUSED");
    });
});

describe("Routes catalogue utilisées par le front", () => {
    beforeEach(() => ArticleModel.getAllArticles.mockResolvedValue({ rows: [], total: 0 }));

    test("/categorie/the retrouve la catégorie « Thé » (accents et majuscules ignorés)", async () => {
        const res = await request(app).get("/api/articles/categorie/the");

        expect(res.status).toBe(200);
        expect(ArticleModel.getAllArticles).toHaveBeenCalledWith({ category: "Thé" });
    });

    test("/categorie/inconnue renvoie 400", async () => {
        const res = await request(app).get("/api/articles/categorie/chocolat");
        expect(res.status).toBe(400);
    });

    test("/promo et /phare filtrent sur les drapeaux du produit", async () => {
        await request(app).get("/api/articles/promo");
        await request(app).get("/api/articles/phare");

        expect(ArticleModel.getAllArticles).toHaveBeenNthCalledWith(1, { onSale: true });
        expect(ArticleModel.getAllArticles).toHaveBeenNthCalledWith(2, { featured: true });
    });
});

describe("GET /api/articles/:id", () => {
    test("200 si l'article existe", async () => {
        ArticleModel.getArticleById.mockResolvedValue([{ code_produit: 5 }]);

        const res = await request(app).get("/api/articles/5");

        expect(res.status).toBe(200);
        expect(ArticleModel.getArticleById).toHaveBeenCalledWith(5);
    });

    test("404 si l'article n'existe pas ou est désactivé", async () => {
        ArticleModel.getArticleById.mockResolvedValue([]);

        const res = await request(app).get("/api/articles/999");

        expect(res.status).toBe(404);
    });

    test("400 si l'identifiant n'est pas un entier (tentative d'injection)", async () => {
        const res = await request(app).get("/api/articles/1%20OR%201=1");

        expect(res.status).toBe(400);
        expect(ArticleModel.getArticleById).not.toHaveBeenCalled();
    });
});

describe("POST /api/articles (administrateur)", () => {
    test("401 sans être connecté", async () => {
        const res = await request(app).post("/api/articles").send(validArticle);
        expect(res.status).toBe(401);
    });

    test("403 pour un client ou un vendeur", async () => {
        const asClient = await request(app).post("/api/articles").set(authHeader("ROLE_CLIENT")).send(validArticle);
        const asSeller = await request(app).post("/api/articles").set(authHeader("ROLE_SELLER")).send(validArticle);

        expect(asClient.status).toBe(403);
        expect(asSeller.status).toBe(403);
        expect(ArticleModel.createArticle).not.toHaveBeenCalled();
    });

    test("201 : la TVA et le prix TTC sont calculés par le serveur", async () => {
        ArticleModel.createArticle.mockResolvedValue(31);

        const res = await request(app)
            .post("/api/articles")
            .set(authHeader("ROLE_ADMIN"))
            // Le prix TTC et la TVA envoyés par le client sont ignorés
            .send({ ...validArticle, prix_ttc: 0.01, tva: 0 });

        expect(res.status).toBe(201);
        expect(res.body.article.tva).toBe(5.5);
        expect(res.body.article.prix_ttc).toBe(18);
    });

    test("400 avec la liste des erreurs si les données sont invalides", async () => {
        const res = await request(app)
            .post("/api/articles")
            .set(authHeader("ROLE_ADMIN"))
            .send({ ...validArticle, categorie: "Chocolat", prix_HT: -5, taux_remise: 95 });

        expect(res.status).toBe(400);
        expect(res.body.errors.length).toBe(3);
    });
});

describe("DELETE /api/articles/:id (administrateur)", () => {
    test("désactive l'article au lieu de le supprimer", async () => {
        ArticleModel.deactivateArticle.mockResolvedValue(1);

        const res = await request(app).delete("/api/articles/3").set(authHeader("ROLE_ADMIN"));

        expect(res.status).toBe(200);
        expect(ArticleModel.deactivateArticle).toHaveBeenCalledWith(3);
    });
});
