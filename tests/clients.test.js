// Tests d'intégration et de sécurité des routes /api/clients et /api/adresses
jest.mock("../db", () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock("../client/models/ClientModel");
jest.mock("../adresse/models/AdresseModel");
jest.mock("../order/models/OrderModel");

const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../app");
const ClientModel = require("../client/models/ClientModel");
const AdresseModel = require("../adresse/models/AdresseModel");
const { authHeader } = require("./helpers");

const PASSWORD = "CafThe#2026test";
const dbClient = {
    code_client: 1,
    nom_client: "Dupont",
    prenom_client: "Marie",
    email: "marie.dupont@email.com",
    telephone: "0601020304",
};
const newClient = { nom: "Dupont", prenom: "Marie", email: "marie.dupont@email.com", telephone: "0601020304", mdp: PASSWORD };

let passwordHash;
beforeAll(async () => {
    passwordHash = await bcrypt.hash(PASSWORD, 4);
});
afterEach(() => jest.clearAllMocks());

describe("POST /api/clients/register", () => {
    test("201 : le mot de passe est haché avant l'enregistrement", async () => {
        ClientModel.findClientByEmail.mockResolvedValue([]);
        ClientModel.createClient.mockResolvedValue({ insertId: 7 });

        const res = await request(app).post("/api/clients/register").send(newClient);

        expect(res.status).toBe(201);
        expect(res.body.client_id).toBe(7);
        const saved = ClientModel.createClient.mock.calls[0][0];
        expect(saved.mdp).not.toBe(PASSWORD);
        expect(await bcrypt.compare(PASSWORD, saved.mdp)).toBe(true);
    });

    test("400 avec un message lisible si le mot de passe est trop faible", async () => {
        const res = await request(app).post("/api/clients/register").send({ ...newClient, mdp: "azerty" });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/12 caractères/);
        expect(ClientModel.createClient).not.toHaveBeenCalled();
    });

    test("409 si l'email est déjà utilisé", async () => {
        ClientModel.findClientByEmail.mockResolvedValue([{ ...dbClient, mdp: passwordHash }]);

        const res = await request(app).post("/api/clients/register").send(newClient);

        expect(res.status).toBe(409);
    });
});

describe("POST /api/clients/login", () => {
    test("200 : cookie HttpOnly + SameSite, jamais de mot de passe dans la réponse", async () => {
        ClientModel.findClientByEmail.mockResolvedValue([{ ...dbClient, mdp: passwordHash }]);

        const res = await request(app)
            .post("/api/clients/login")
            .send({ email: "Marie.Dupont@email.com", mdp: PASSWORD });

        expect(res.status).toBe(200);
        expect(res.body.client).toEqual({ id: 1, nom: "Dupont", prenom: "Marie", email: dbClient.email, telephone: dbClient.telephone });
        const cookie = res.headers["set-cookie"][0];
        expect(cookie).toMatch(/HttpOnly/);
        expect(cookie).toMatch(/SameSite=Strict/);
        expect(JSON.stringify(res.body)).not.toContain("mdp");
        // L'email est normalisé avant la recherche
        expect(ClientModel.findClientByEmail).toHaveBeenCalledWith("marie.dupont@email.com");
    });

    test("401 avec le même message que l'email existe ou non (pas d'énumération)", async () => {
        ClientModel.findClientByEmail.mockResolvedValueOnce([{ ...dbClient, mdp: passwordHash }]);
        const wrongPassword = await request(app)
            .post("/api/clients/login")
            .send({ email: dbClient.email, mdp: "Mauvais#Pass1" });

        ClientModel.findClientByEmail.mockResolvedValueOnce([]);
        const unknownEmail = await request(app)
            .post("/api/clients/login")
            .send({ email: "inconnu@email.com", mdp: "Mauvais#Pass1" });

        expect(wrongPassword.status).toBe(401);
        expect(unknownEmail.status).toBe(401);
        expect(wrongPassword.body.message).toBe(unknownEmail.body.message);
    });

    test("401 pour un compte créé en boutique sans mot de passe", async () => {
        ClientModel.findClientByEmail.mockResolvedValue([{ ...dbClient, mdp: null }]);

        const res = await request(app).post("/api/clients/login").send({ email: dbClient.email, mdp: PASSWORD });

        expect(res.status).toBe(401);
    });

    test("400 si le corps de la requête est vide", async () => {
        const res = await request(app).post("/api/clients/login");
        expect(res.status).toBe(400);
    });
});

describe("POST /api/clients/activate (compte créé en boutique)", () => {
    test("200 si l'email et le téléphone correspondent", async () => {
        ClientModel.findClientByEmail.mockResolvedValue([{ ...dbClient, mdp: null }]);

        const res = await request(app)
            .post("/api/clients/activate")
            .send({ email: dbClient.email, telephone: "0601020304", mdp: PASSWORD });

        expect(res.status).toBe(200);
        expect(ClientModel.updatePassword).toHaveBeenCalled();
        expect(res.headers["set-cookie"][0]).toMatch(/HttpOnly/);
    });

    test("400 si le téléphone ne correspond pas", async () => {
        ClientModel.findClientByEmail.mockResolvedValue([{ ...dbClient, mdp: null }]);

        const res = await request(app)
            .post("/api/clients/activate")
            .send({ email: dbClient.email, telephone: "0699999999", mdp: PASSWORD });

        expect(res.status).toBe(400);
        expect(ClientModel.updatePassword).not.toHaveBeenCalled();
    });

    test("400 si le compte a déjà un mot de passe (pas de prise de contrôle)", async () => {
        ClientModel.findClientByEmail.mockResolvedValue([{ ...dbClient, mdp: passwordHash }]);

        const res = await request(app)
            .post("/api/clients/activate")
            .send({ email: dbClient.email, telephone: "0601020304", mdp: PASSWORD });

        expect(res.status).toBe(400);
    });
});

describe("Espace client", () => {
    test("401 sans token", async () => {
        const res = await request(app).get("/api/clients/me");
        expect(res.status).toBe(401);
    });

    test("403 pour un employé (route réservée aux clients)", async () => {
        const res = await request(app).get("/api/clients/me").set(authHeader("ROLE_SELLER"));
        expect(res.status).toBe(403);
    });

    test("200 : renvoie le profil du client du token", async () => {
        ClientModel.findClientById.mockResolvedValue([dbClient]);

        const res = await request(app).get("/api/clients/me").set(authHeader("ROLE_CLIENT", 1));

        expect(res.status).toBe(200);
        expect(ClientModel.findClientById).toHaveBeenCalledWith(1);
    });

    test("401 si l'ancien mot de passe est faux lors d'un changement", async () => {
        ClientModel.findClientPasswordHash.mockResolvedValue(passwordHash);

        const res = await request(app)
            .put("/api/clients/me/password")
            .set(authHeader("ROLE_CLIENT", 1))
            .send({ ancienMdp: "Mauvais#Pass1", nouveauMdp: "Nouveau#Pass2026" });

        expect(res.status).toBe(401);
        expect(ClientModel.updatePassword).not.toHaveBeenCalled();
    });

    test("409 si le nouvel email appartient à un autre client", async () => {
        ClientModel.findClientById.mockResolvedValue([dbClient]);
        ClientModel.findClientByEmail.mockResolvedValue([{ code_client: 2 }]);

        const res = await request(app)
            .put("/api/clients/me")
            .set(authHeader("ROLE_CLIENT", 1))
            .send({ email: "lucas.martin@email.com" });

        expect(res.status).toBe(409);
        expect(ClientModel.updateClient).not.toHaveBeenCalled();
    });
});

describe("Carnet d'adresses /api/adresses", () => {
    test("201 : l'adresse est rattachée au client du token", async () => {
        AdresseModel.createAdresse.mockResolvedValue({ insertId: 9 });

        const res = await request(app)
            .post("/api/adresses")
            .set(authHeader("ROLE_CLIENT", 1))
            .send({ rue: "1 rue A", cp: "45000", ville: "Orléans", code_client: 2 });

        expect(res.status).toBe(201);
        expect(AdresseModel.createAdresse).toHaveBeenCalledWith(expect.objectContaining({ code_client: 1, titre: "Domicile", pays: "France" }));
    });

    test("404 en modifiant l'adresse d'un autre client", async () => {
        AdresseModel.updateAdresse.mockResolvedValue({ affectedRows: 0 });

        const res = await request(app)
            .put("/api/adresses/3")
            .set(authHeader("ROLE_CLIENT", 1))
            .send({ rue: "1 rue A", cp: "45000", ville: "Orléans" });

        expect(res.status).toBe(404);
        expect(AdresseModel.updateAdresse).toHaveBeenCalledWith(3, 1, expect.any(Object));
    });

    test("409 en supprimant une adresse utilisée par une commande", async () => {
        AdresseModel.getAdresseById.mockResolvedValue([{ id_adresse: 1 }]);
        AdresseModel.isAdresseUsedByOrder.mockResolvedValue(true);

        const res = await request(app).delete("/api/adresses/1").set(authHeader("ROLE_CLIENT", 1));

        expect(res.status).toBe(409);
        expect(AdresseModel.deleteAdresse).not.toHaveBeenCalled();
    });
});

describe("Gestion des clients en magasin", () => {
    test("201 : le vendeur crée une fiche sans mot de passe, rattachée à lui", async () => {
        ClientModel.createClient.mockResolvedValue({ insertId: 4 });
        ClientModel.findClientById.mockResolvedValue([{ code_client: 4 }]);

        const res = await request(app)
            .post("/api/clients")
            .set(authHeader("ROLE_SELLER", 2))
            .send({ nom: "Lefebvre", prenom: "Sophie", email: "sophie@email.com", telephone: "0755443322" });

        expect(res.status).toBe(201);
        expect(ClientModel.createClient).toHaveBeenCalledWith(expect.objectContaining({ num_employe_createur: 2 }));
        expect(ClientModel.createClient.mock.calls[0][0].mdp).toBeUndefined();
    });

    test("403 si un client essaie de rechercher les autres clients", async () => {
        const res = await request(app).get("/api/clients?search=dupont").set(authHeader("ROLE_CLIENT"));
        expect(res.status).toBe(403);
    });
});
