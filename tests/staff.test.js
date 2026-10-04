// Tests des droits du personnel : comptes employés et tableau de bord
jest.mock("../db", () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock("../employee/models/EmployeeModel");
jest.mock("../dashboard/models/DashboardModel");

const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../app");
const EmployeeModel = require("../employee/models/EmployeeModel");
const DashboardModel = require("../dashboard/models/DashboardModel");
const { authHeader } = require("./helpers");

afterEach(() => jest.clearAllMocks());

describe("POST /api/employees/login", () => {
    test("200 et cookie de session de 30 minutes", async () => {
        const hash = await bcrypt.hash("CafThe#2026test", 4);
        EmployeeModel.findEmployeeByEmail.mockResolvedValue({ num_employe: 1, role: "ROLE_ADMIN", mdp_employe: hash });
        EmployeeModel.findEmployeeById.mockResolvedValue({ num_employe: 1, role: "ROLE_ADMIN" });

        const res = await request(app)
            .post("/api/employees/login")
            .send({ email: "admin@cafthe.com", mdp: "CafThe#2026test" });

        expect(res.status).toBe(200);
        expect(res.headers["set-cookie"][0]).toMatch(/Max-Age=1800/);
    });
});

describe("Gestion des comptes employés (administrateur uniquement)", () => {
    test("403 pour un vendeur (CDC : seul l'admin gère les comptes vendeurs)", async () => {
        const res = await request(app).get("/api/employees").set(authHeader("ROLE_SELLER", 2));

        expect(res.status).toBe(403);
        expect(EmployeeModel.getAllEmployees).not.toHaveBeenCalled();
    });

    test("400 : l'administrateur ne peut pas supprimer son propre compte", async () => {
        const res = await request(app).delete("/api/employees/1").set(authHeader("ROLE_ADMIN", 1));

        expect(res.status).toBe(400);
        expect(EmployeeModel.deleteEmployee).not.toHaveBeenCalled();
    });

    test("400 si le rôle demandé n'existe pas", async () => {
        const res = await request(app)
            .post("/api/employees")
            .set(authHeader("ROLE_ADMIN", 1))
            .send({
                nom_employe: "Neuf",
                prenom_employe: "Vendeur",
                email_employe: "neuf@cafthe.com",
                tel_employe: "0611111111",
                role: "ROLE_SUPERADMIN",
                mdp_employe: "Abcdefgh1234!",
            });

        expect(res.status).toBe(400);
    });
});

describe("GET /api/dashboard/kpi", () => {
    test("403 pour un client", async () => {
        const res = await request(app).get("/api/dashboard/kpi").set(authHeader("ROLE_CLIENT"));
        expect(res.status).toBe(403);
    });

    test("200 pour un vendeur avec tous les indicateurs", async () => {
        DashboardModel.getRevenue.mockResolvedValue({ jour: 0, semaine: 0, mois: 0, annee: 0 });
        DashboardModel.getSalesSummary.mockResolvedValue({ nombre_ventes: 3, panier_moyen: 67.23 });
        DashboardModel.getTopProducts.mockResolvedValue([]);
        DashboardModel.getSalesByCategory.mockResolvedValue([]);
        DashboardModel.getNewClientsByMonth.mockResolvedValue([]);

        const res = await request(app).get("/api/dashboard/kpi").set(authHeader("ROLE_SELLER"));

        expect(res.status).toBe(200);
        expect(Object.keys(res.body.kpi)).toEqual([
            "chiffre_affaires", "nombre_ventes", "panier_moyen",
            "top_produits", "ventes_par_categorie", "nouveaux_clients_par_mois",
        ]);
    });
});

describe("Robustesse générale", () => {
    test("404 JSON pour une route inconnue", async () => {
        const res = await request(app).get("/api/inconnue");
        expect(res.status).toBe(404);
    });

    test("400 pour un JSON mal formé", async () => {
        const res = await request(app)
            .post("/api/clients/login")
            .set("Content-Type", "application/json")
            .send("{mauvais json");
        expect(res.status).toBe(400);
    });

    test("les en-têtes de sécurité Helmet sont présents", async () => {
        const res = await request(app).get("/health");
        expect(res.headers["x-content-type-options"]).toBe("nosniff");
        expect(res.headers["x-powered-by"]).toBeUndefined();
    });
});
