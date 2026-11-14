// Tests du mot de passe oublié : POST /api/clients/forgot-password et /reset-password
jest.mock("../db", () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock("../client/models/ClientModel");
jest.mock("../password-reset/models/PasswordResetModel", () => ({
    ...jest.requireActual("../password-reset/models/PasswordResetModel"),
    createResetToken: jest.fn(),
    findValidToken: jest.fn(),
    markTokenUsed: jest.fn(),
}));
jest.mock("../utils/mailer");

const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../app");
const ClientModel = require("../client/models/ClientModel");
const PasswordResetModel = require("../password-reset/models/PasswordResetModel");
const { sendMail } = require("../utils/mailer");

const TOKEN = "a".repeat(64);
const NEW_PASSWORD = "Nouveau#Mdp2026";
const dbClient = { code_client: 1, prenom_client: "Marie", email: "marie.dupont@email.com", mdp: "hash" };

afterEach(() => jest.clearAllMocks());

describe("POST /api/clients/forgot-password", () => {
    test("200 : un lien contenant le jeton est envoyé par email au client", async () => {
        ClientModel.findClientByEmail.mockResolvedValue([dbClient]);
        PasswordResetModel.createResetToken.mockResolvedValue(TOKEN);

        const res = await request(app).post("/api/clients/forgot-password").send({ email: "Marie.Dupont@email.com " });

        expect(res.status).toBe(200);
        expect(PasswordResetModel.createResetToken).toHaveBeenCalledWith("client", 1);
        expect(sendMail).toHaveBeenCalledTimes(1);
        expect(sendMail.mock.calls[0][0].to).toBe(dbClient.email);
        expect(sendMail.mock.calls[0][0].text).toContain(`/#/reset-password?token=${TOKEN}`);
    });

    test("même réponse si l'email n'a pas de compte (on ne révèle pas les comptes existants)", async () => {
        ClientModel.findClientByEmail.mockResolvedValue([dbClient]);
        PasswordResetModel.createResetToken.mockResolvedValue(TOKEN);
        const known = await request(app).post("/api/clients/forgot-password").send({ email: dbClient.email });

        ClientModel.findClientByEmail.mockResolvedValue([]);
        const unknown = await request(app).post("/api/clients/forgot-password").send({ email: "inconnu@email.com" });

        expect(unknown.status).toBe(200);
        expect(unknown.body).toEqual(known.body);
        expect(sendMail).toHaveBeenCalledTimes(1);
    });

    test("400 si l'email est invalide", async () => {
        const res = await request(app).post("/api/clients/forgot-password").send({ email: "pas-un-email" });

        expect(res.status).toBe(400);
        expect(ClientModel.findClientByEmail).not.toHaveBeenCalled();
    });
});

describe("POST /api/clients/reset-password", () => {
    test("200 : le nouveau mot de passe est haché et le jeton ne peut plus servir", async () => {
        PasswordResetModel.findValidToken.mockResolvedValue({ id: 9, account_id: 1 });

        const res = await request(app).post("/api/clients/reset-password").send({ token: TOKEN, mdp: NEW_PASSWORD });

        expect(res.status).toBe(200);
        expect(PasswordResetModel.findValidToken).toHaveBeenCalledWith("client", TOKEN);
        const [clientId, savedHash] = ClientModel.updatePassword.mock.calls[0];
        expect(clientId).toBe(1);
        expect(await bcrypt.compare(NEW_PASSWORD, savedHash)).toBe(true);
        expect(PasswordResetModel.markTokenUsed).toHaveBeenCalledWith(9);
    });

    test("400 si le jeton est expiré, déjà utilisé ou inconnu", async () => {
        PasswordResetModel.findValidToken.mockResolvedValue(undefined);

        const res = await request(app).post("/api/clients/reset-password").send({ token: TOKEN, mdp: NEW_PASSWORD });

        expect(res.status).toBe(400);
        expect(ClientModel.updatePassword).not.toHaveBeenCalled();
    });

    test("400 si le jeton est mal formé ou le mot de passe trop faible", async () => {
        const badToken = await request(app).post("/api/clients/reset-password").send({ token: "' OR 1=1 --", mdp: NEW_PASSWORD });
        const weak = await request(app).post("/api/clients/reset-password").send({ token: TOKEN, mdp: "azerty" });

        expect(badToken.status).toBe(400);
        expect(weak.status).toBe(400);
        expect(weak.body.message).toMatch(/12 caractères/);
        expect(PasswordResetModel.findValidToken).not.toHaveBeenCalled();
    });
});

describe("Jeton de réinitialisation", () => {
    test("seule l'empreinte SHA-256 est stockée (64 caractères, différente du jeton)", () => {
        const hash = PasswordResetModel.hashToken(TOKEN);
        expect(hash).toMatch(/^[a-f0-9]{64}$/);
        expect(hash).not.toBe(TOKEN);
    });
});
