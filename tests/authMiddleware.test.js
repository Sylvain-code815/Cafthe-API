// Tests unitaires et de sécurité du middleware d'authentification ("Le Vigile")
const jwt = require("jsonwebtoken");
const { verifyToken, requireRole } = require("../middleware/authMiddleware");
const { signToken } = require("../utils/authToken");

// Fausse réponse Express qui mémorise le statut et le JSON renvoyés
const mockResponse = () => {
    const res = {};
    res.status = jest.fn(() => res);
    res.json = jest.fn(() => res);
    return res;
};

describe("verifyToken", () => {
    test("laisse passer un token valide (cookie) et injecte l'utilisateur", () => {
        const req = { cookies: { token: signToken({ id: 7, role: "ROLE_CLIENT" }, 60) }, headers: {} };
        const res = mockResponse();
        const next = jest.fn();

        verifyToken(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.user).toEqual({ id: 7, role: "ROLE_CLIENT" });
    });

    test("accepte aussi l'en-tête Authorization: Bearer", () => {
        const req = { headers: { authorization: `Bearer ${signToken({ id: 1, role: "ROLE_ADMIN" }, 60)}` } };
        const next = jest.fn();

        verifyToken(req, mockResponse(), next);

        expect(next).toHaveBeenCalled();
    });

    test("401 sans token", () => {
        const res = mockResponse();
        const next = jest.fn();

        verifyToken({ headers: {} }, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    test("401 si le token est signé avec une autre clé (token forgé)", () => {
        const forged = jwt.sign({ id: 1, role: "ROLE_ADMIN" }, "cle_de_l_attaquant");
        const res = mockResponse();

        verifyToken({ headers: { authorization: `Bearer ${forged}` } }, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(401);
    });

    test("401 si le token n'est pas signé (alg: none)", () => {
        const unsigned = jwt.sign({ id: 1, role: "ROLE_ADMIN" }, null, { algorithm: "none" });
        const res = mockResponse();

        verifyToken({ headers: { authorization: `Bearer ${unsigned}` } }, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(401);
    });

    test("401 si le token est expiré", () => {
        const expired = jwt.sign(
            { id: 1, role: "ROLE_CLIENT", exp: Math.floor(Date.now() / 1000) - 10 },
            process.env.JWT_SECRET
        );
        const res = mockResponse();

        verifyToken({ headers: { authorization: `Bearer ${expired}` } }, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(401);
    });

    test("401 si le contenu du token a été modifié (élévation de rôle)", () => {
        const [header, , signature] = signToken({ id: 1, role: "ROLE_CLIENT" }, 60).split(".");
        const fakePayload = Buffer.from(JSON.stringify({ id: 1, role: "ROLE_ADMIN" })).toString("base64url");
        const res = mockResponse();

        verifyToken({ headers: { authorization: `Bearer ${header}.${fakePayload}.${signature}` } }, res, jest.fn());

        expect(res.status).toHaveBeenCalledWith(401);
    });
});

describe("requireRole", () => {
    test("laisse passer un rôle autorisé", () => {
        const next = jest.fn();
        requireRole("ROLE_ADMIN")({ user: { id: 1, role: "ROLE_ADMIN" } }, mockResponse(), next);
        expect(next).toHaveBeenCalled();
    });

    test("403 pour un rôle non autorisé (vendeur sur une route admin)", () => {
        const res = mockResponse();
        const next = jest.fn();

        requireRole("ROLE_ADMIN")({ user: { id: 2, role: "ROLE_SELLER" } }, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });
});
