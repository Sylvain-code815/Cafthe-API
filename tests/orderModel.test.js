// Tests unitaires du composant d'accès aux données OrderModel.createOrder
// On simule la connexion MySQL pour vérifier la gestion de la transaction
jest.mock("../db", () => ({ query: jest.fn(), getConnection: jest.fn() }));

const db = require("../db");
const { createOrder, OrderError } = require("../order/models/OrderModel");

// Fausse connexion : chaque appel à query() renvoie la réponse suivante de la liste
const mockConnection = (responses) => {
    const connection = {
        beginTransaction: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
        release: jest.fn(),
        query: jest.fn(),
    };
    responses.forEach((response) => connection.query.mockResolvedValueOnce(response));
    db.getConnection.mockResolvedValue(connection);
    return connection;
};

const baseOrder = {
    codeClient: 1,
    mode: "web",
    status: "pending",
    paymentMode: "card",
    paid: true,
    deliveryAddressId: null,
    billingAddressId: null,
    deliveryMode: "pickup",
    deliveryDays: 0,
    shippingCost: 0,
};

const sencha = { code_produit: 3, nom_produit: "Sencha", type_vente: "Boite", prix_ttc: "18.00", produit_promotion: 0, taux_remise: 0, stock: 80 };
const robusta = { code_produit: 2, nom_produit: "Robusta", type_vente: "Boite", prix_ttc: "12.50", produit_promotion: 1, taux_remise: 50, stock: 50 };
const rooibos = { code_produit: 8, nom_produit: "Rooibos", type_vente: "Vrac", prix_ttc: "14.00", produit_promotion: 0, taux_remise: 0, stock: 80 };

afterEach(() => jest.clearAllMocks());

test("valide la transaction et calcule le total avec les prix et remises de la BDD", async () => {
    const connection = mockConnection([
        [[sencha, robusta, rooibos]], // SELECT ... FOR UPDATE
        [{ insertId: 42 }],           // INSERT commande
        [{}],                         // INSERT lignes
        [{}], [{}], [{}],             // UPDATE stock x3
    ]);

    const result = await createOrder({
        ...baseOrder,
        shippingCost: 4.99,
        lines: [
            { code_produit: 3, quantite: 1, byWeight: false },
            { code_produit: 2, quantite: 2, byWeight: false },
            { code_produit: 8, quantite: 5, byWeight: true }, // 500 g
        ],
    });

    // 18.00 + 2 x 6.25 (remise 50 %) + 5 x 14.00 + 4.99 de livraison
    expect(result).toEqual({ num_commande: 42, total: 105.49 });
    expect(connection.query.mock.calls[0][0]).toContain("FOR UPDATE");
    expect(connection.commit).toHaveBeenCalled();
    expect(connection.rollback).not.toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();
});

test("annule tout (ROLLBACK) si le stock est insuffisant", async () => {
    const connection = mockConnection([[[{ ...sencha, stock: 15 }]]]);

    await expect(createOrder({ ...baseOrder, lines: [{ code_produit: 3, quantite: 16, byWeight: false }] }))
        .rejects.toMatchObject({ status: 409 });

    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.commit).not.toHaveBeenCalled();
    // Aucune commande n'a été insérée
    expect(connection.query).toHaveBeenCalledTimes(1);
    expect(connection.release).toHaveBeenCalled();
});

test("refuse un produit au poids commandé à l'unité", async () => {
    mockConnection([[[rooibos]]]);

    await expect(createOrder({ ...baseOrder, lines: [{ code_produit: 8, quantite: 1, byWeight: false }] }))
        .rejects.toMatchObject({ status: 400 });
});

test("refuse un produit inconnu ou désactivé", async () => {
    mockConnection([[[]]]);

    await expect(createOrder({ ...baseOrder, lines: [{ code_produit: 999, quantite: 1, byWeight: false }] }))
        .rejects.toBeInstanceOf(OrderError);
});

test("refuse une adresse qui n'appartient pas au client", async () => {
    const connection = mockConnection([[[]]]); // aucune adresse trouvée pour ce client

    await expect(createOrder({
        ...baseOrder,
        deliveryAddressId: 3,
        billingAddressId: 3,
        deliveryMode: "standard",
        deliveryDays: 5,
        lines: [{ code_produit: 3, quantite: 1, byWeight: false }],
    })).rejects.toMatchObject({ status: 400 });

    expect(connection.rollback).toHaveBeenCalled();
});

test("libère la connexion et annule si MySQL renvoie une erreur", async () => {
    const connection = mockConnection([]);
    connection.query.mockRejectedValueOnce(new Error("Lost connection"));

    await expect(createOrder({ ...baseOrder, lines: [{ code_produit: 3, quantite: 1, byWeight: false }] }))
        .rejects.toThrow("Lost connection");

    expect(connection.rollback).toHaveBeenCalled();
    expect(connection.release).toHaveBeenCalled();
});
