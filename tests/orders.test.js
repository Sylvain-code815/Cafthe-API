// Tests d'intégration des routes /api/orders
jest.mock("../db", () => ({ query: jest.fn(), getConnection: jest.fn() }));
jest.mock("../order/models/OrderModel", () => ({
    ...jest.requireActual("../order/models/OrderModel"),
    createOrder: jest.fn(),
    getOrdersByClient: jest.fn(),
    getOrderById: jest.fn(),
    getAllOrders: jest.fn(),
    updateOrderStatus: jest.fn(),
}));

const request = require("supertest");
const app = require("../app");
const OrderModel = require("../order/models/OrderModel");
const { authHeader } = require("./helpers");

const homeDelivery = {
    lines: [{ code_produit: 3, quantite: 2 }],
    mode_livraison: "standard",
    id_adresse_livraison: 1,
    mode_paiement: "card",
};

afterEach(() => jest.clearAllMocks());

describe("POST /api/orders", () => {
    test("401 sans être connecté (un visiteur ne peut pas commander)", async () => {
        const res = await request(app).post("/api/orders").send(homeDelivery);
        expect(res.status).toBe(401);
    });

    test("201 : commande web, poids convertis en tranches de 100 g et doublons regroupés", async () => {
        OrderModel.createOrder.mockResolvedValue({ num_commande: 10, total: 54 });

        const res = await request(app)
            .post("/api/orders")
            .set(authHeader("ROLE_CLIENT", 1))
            .send({
                ...homeDelivery,
                lines: [
                    { code_produit: 3, quantite: 2 },
                    { code_produit: 3, quantite: 1 },
                    { code_produit: 8, quantite: 1, poids: 500 },
                    { code_produit: 8, quantite: 2, poids: 200 },
                ],
            });

        expect(res.status).toBe(201);
        expect(res.body).toMatchObject({ num_commande: 10, total: 54, frais_livraison: 4.99 });
        expect(OrderModel.createOrder).toHaveBeenCalledWith(expect.objectContaining({
            codeClient: 1,
            mode: "web",
            status: "pending",
            deliveryAddressId: 1,
            billingAddressId: 1,
            deliveryDays: 5,
            lines: [
                { code_produit: 3, quantite: 3, byWeight: false },
                { code_produit: 8, quantite: 9, byWeight: true },
            ],
        }));
    });

    test("le client ne peut pas imposer le code_client d'un autre", async () => {
        OrderModel.createOrder.mockResolvedValue({ num_commande: 11, total: 18 });

        await request(app)
            .post("/api/orders")
            .set(authHeader("ROLE_CLIENT", 1))
            .send({ ...homeDelivery, code_client: 2 });

        expect(OrderModel.createOrder.mock.calls[0][0].codeClient).toBe(1);
    });

    test("retrait en magasin payé au retrait : pas d'adresse, pas de paiement enregistré", async () => {
        OrderModel.createOrder.mockResolvedValue({ num_commande: 12, total: 18 });

        const res = await request(app)
            .post("/api/orders")
            .set(authHeader("ROLE_CLIENT", 1))
            .send({ lines: [{ code_produit: 3, quantite: 1 }], mode_livraison: "pickup", mode_paiement: "in_store" });

        expect(res.status).toBe(201);
        expect(OrderModel.createOrder).toHaveBeenCalledWith(expect.objectContaining({
            deliveryAddressId: null, paid: false, shippingCost: 0,
        }));
    });

    test.each([
        ["panier vide", { ...homeDelivery, lines: [] }],
        ["quantité négative", { ...homeDelivery, lines: [{ code_produit: 3, quantite: -2 }] }],
        ["quantité en texte", { ...homeDelivery, lines: [{ code_produit: 3, quantite: "2" }] }],
        ["poids non multiple de 100 g", { ...homeDelivery, lines: [{ code_produit: 8, quantite: 1, poids: 150 }] }],
        ["livraison sans adresse", { ...homeDelivery, id_adresse_livraison: undefined }],
        ["mode de livraison inconnu", { ...homeDelivery, mode_livraison: "drone" }],
        ["paiement en magasin avec livraison", { ...homeDelivery, mode_paiement: "in_store" }],
        ["moyen de paiement inconnu", { ...homeDelivery, mode_paiement: "bitcoin" }],
    ])("400 : %s", async (label, body) => {
        const res = await request(app).post("/api/orders").set(authHeader("ROLE_CLIENT", 1)).send(body);

        expect(res.status).toBe(400);
        expect(OrderModel.createOrder).not.toHaveBeenCalled();
    });

    test("409 si le stock est insuffisant", async () => {
        OrderModel.createOrder.mockRejectedValue(new OrderModel.OrderError(409, "Stock insuffisant"));

        const res = await request(app).post("/api/orders").set(authHeader("ROLE_CLIENT", 1)).send(homeDelivery);

        expect(res.status).toBe(409);
    });

    test("201 : vente en caisse par un vendeur, payée et remise immédiatement", async () => {
        OrderModel.createOrder.mockResolvedValue({ num_commande: 13, total: 31.8 });

        const res = await request(app)
            .post("/api/orders")
            .set(authHeader("ROLE_SELLER", 2))
            .send({ lines: [{ code_produit: 1, quantite: 2 }], mode_paiement: "cash", code_client: 3 });

        expect(res.status).toBe(201);
        expect(OrderModel.createOrder).toHaveBeenCalledWith(expect.objectContaining({
            codeClient: 3, mode: "store", status: "delivered", paid: true,
        }));
    });
});

describe("GET /api/orders/:id", () => {
    test("404 si la commande appartient à un autre client (pas de fuite d'information)", async () => {
        OrderModel.getOrderById.mockResolvedValue({ num_commande: 2, code_client: 2 });

        const res = await request(app).get("/api/orders/2").set(authHeader("ROLE_CLIENT", 1));

        expect(res.status).toBe(404);
    });

    test("200 pour le propriétaire", async () => {
        OrderModel.getOrderById.mockResolvedValue({ num_commande: 1, code_client: 1 });

        const res = await request(app).get("/api/orders/1").set(authHeader("ROLE_CLIENT", 1));

        expect(res.status).toBe(200);
    });

    test("200 pour un vendeur", async () => {
        OrderModel.getOrderById.mockResolvedValue({ num_commande: 2, code_client: 2 });

        const res = await request(app).get("/api/orders/2").set(authHeader("ROLE_SELLER", 2));

        expect(res.status).toBe(200);
    });
});

describe("PUT /api/orders/:id/status", () => {
    test("200 pour l'étape suivante", async () => {
        OrderModel.getOrderById.mockResolvedValue({ num_commande: 4, statut_commande: "pending" });
        OrderModel.updateOrderStatus.mockResolvedValue(1);

        const res = await request(app)
            .put("/api/orders/4/status")
            .set(authHeader("ROLE_SELLER"))
            .send({ statut_commande: "preparing" });

        expect(res.status).toBe(200);
        expect(OrderModel.updateOrderStatus).toHaveBeenCalledWith(4, "pending", "preparing");
    });

    test("409 si on saute une étape", async () => {
        OrderModel.getOrderById.mockResolvedValue({ num_commande: 4, statut_commande: "pending" });

        const res = await request(app)
            .put("/api/orders/4/status")
            .set(authHeader("ROLE_SELLER"))
            .send({ statut_commande: "delivered" });

        expect(res.status).toBe(409);
        expect(OrderModel.updateOrderStatus).not.toHaveBeenCalled();
    });

    test("403 pour un client", async () => {
        const res = await request(app)
            .put("/api/orders/4/status")
            .set(authHeader("ROLE_CLIENT"))
            .send({ statut_commande: "preparing" });

        expect(res.status).toBe(403);
    });
});
