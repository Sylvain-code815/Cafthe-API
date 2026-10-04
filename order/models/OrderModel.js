const db = require("../../db");
const { getEffectivePrice, isSoldByWeight } = require("../../utils/pricing");

// Erreur métier : porte le code HTTP que le contrôleur doit renvoyer
class OrderError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

// Enregistrer une commande dans une TRANSACTION (tout ou rien) :
// 1. vérifie que les adresses appartiennent au client
// 2. verrouille les produits commandés (SELECT ... FOR UPDATE)
// 3. vérifie qu'ils existent, sont actifs, vendus au bon format et en stock suffisant
// 4. calcule le total avec les prix de la BDD, remise comprise (jamais ceux envoyés par le front)
// 5. insère la commande, ses lignes (prix figé) et la livraison éventuelle
// 6. décrémente les stocks
// Si une étape échoue, ROLLBACK : aucune donnée partielle n'est enregistrée
//
// order : { codeClient, mode, status, paymentMode, paid, deliveryAddressId, billingAddressId,
//           deliveryMode, deliveryDays, shippingCost, lines }
// lines : [{ code_produit, quantite, byWeight }] sans doublon
//         (pour un produit au poids, quantite = nombre de tranches de 100 g)
const createOrder = async (order) => {
    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Les adresses de livraison et de facturation doivent appartenir au client
        const addressIds = [...new Set([order.deliveryAddressId, order.billingAddressId].filter(Boolean))];
        if (addressIds.length > 0) {
            const [addresses] = await connection.query(
                "SELECT id_adresse FROM adresse WHERE id_adresse IN (?) AND code_client = ?",
                [addressIds, order.codeClient]
            );
            if (addresses.length !== addressIds.length) {
                throw new OrderError(400, "Adresse inconnue");
            }
        }

        // Verrouillage des lignes produit : deux commandes simultanées ne peuvent
        // pas vendre le même dernier article
        const productIds = order.lines.map((line) => line.code_produit);
        const [products] = await connection.query(
            `SELECT code_produit, nom_produit, type_vente, prix_ttc, produit_promotion, taux_remise, stock
             FROM produit WHERE code_produit IN (?) AND active = 1 FOR UPDATE`,
            [productIds]
        );
        const productsById = new Map(products.map((product) => [product.code_produit, product]));

        // Calcul en centimes pour éviter les erreurs d'arrondi des nombres à virgule
        let totalCents = Math.round(order.shippingCost * 100);
        for (const line of order.lines) {
            const product = productsById.get(line.code_produit);
            if (!product) {
                throw new OrderError(400, `Produit ${line.code_produit} introuvable`);
            }
            if (isSoldByWeight(product.type_vente) !== line.byWeight) {
                throw new OrderError(400, line.byWeight
                    ? `"${product.nom_produit}" ne se vend pas au poids`
                    : `"${product.nom_produit}" se vend au poids : indiquez le poids`);
            }
            if (product.stock < line.quantite) {
                throw new OrderError(409, `Stock insuffisant pour "${product.nom_produit}"`);
            }
            line.prix_unitaire_achete = getEffectivePrice(product);
            totalCents += Math.round(line.prix_unitaire_achete * 100) * line.quantite;
        }
        const total = totalCents / 100;

        const [result] = await connection.query(
            `INSERT INTO commande
                (code_client, id_adresse_livraison, id_adresse_facturation, statut_commande,
                 mode_commande, date_commande, mode_paiement, total, date_paiement)
             VALUES (?, ?, ?, ?, ?, NOW(), ?, ?, IF(?, NOW(), NULL))`,
            [
                order.codeClient, order.deliveryAddressId || null, order.billingAddressId || null,
                order.status, order.mode, order.paymentMode, total, order.paid,
            ]
        );
        const orderId = result.insertId;

        // Insertion groupée des lignes : VALUES (?, ?, ?, ?), (?, ?, ?, ?)...
        await connection.query(
            "INSERT INTO ligne_commande (num_commande, code_produit, quantite, prix_unitaire_achete) VALUES ?",
            [order.lines.map((line) => [orderId, line.code_produit, line.quantite, line.prix_unitaire_achete])]
        );

        for (const line of order.lines) {
            await connection.query(
                "UPDATE produit SET stock = stock - ? WHERE code_produit = ?",
                [line.quantite, line.code_produit]
            );
        }

        // Bon de livraison (sauf retrait en magasin)
        if (order.deliveryAddressId) {
            await connection.query(
                `INSERT INTO livraison (num_commande, delai_livraison, date_livraison, choix_transporteur)
                 VALUES (?, ?, DATE_ADD(CURDATE(), INTERVAL ? DAY), ?)`,
                [orderId, order.deliveryDays, order.deliveryDays, order.deliveryMode]
            );
        }

        await connection.commit();
        return { num_commande: orderId, total };
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        // On rend toujours la connexion au pool, même en cas d'erreur
        connection.release();
    }
};

// Historique des commandes d'un client (achats web ET magasin)
const getOrdersByClient = async (clientId) => {
    const [rows] = await db.query(
        `SELECT c.num_commande, c.statut_commande, c.mode_commande, c.date_commande, c.mode_paiement,
                c.total, c.date_paiement, COUNT(l.code_produit) AS nombre_produits
         FROM commande c
         LEFT JOIN ligne_commande l ON l.num_commande = c.num_commande
         WHERE c.code_client = ?
         GROUP BY c.num_commande
         ORDER BY c.date_commande DESC`,
        [clientId]
    );
    return rows;
};

// Détail complet d'une commande : en-tête, lignes, adresses et livraison
const getOrderById = async (orderId) => {
    const [orders] = await db.query(
        `SELECT c.*, cl.nom_client, cl.prenom_client, cl.email
         FROM commande c
         JOIN client cl ON cl.code_client = c.code_client
         WHERE c.num_commande = ?`,
        [orderId]
    );
    if (orders.length === 0) return undefined;
    const order = orders[0];

    const [lignes] = await db.query(
        `SELECT l.code_produit, p.nom_produit, p.type_vente, p.image, l.quantite, l.prix_unitaire_achete,
                l.quantite * l.prix_unitaire_achete AS sous_total
         FROM ligne_commande l
         JOIN produit p ON p.code_produit = l.code_produit
         WHERE l.num_commande = ?`,
        [orderId]
    );
    const [adresses] = await db.query(
        "SELECT id_adresse, titre, rue, cp, ville, pays FROM adresse WHERE id_adresse IN (?, ?)",
        [order.id_adresse_livraison, order.id_adresse_facturation]
    );
    const [livraisons] = await db.query(
        "SELECT num_bl, delai_livraison, date_livraison, choix_transporteur FROM livraison WHERE num_commande = ?",
        [orderId]
    );
    const findAddress = (id) => adresses.find((adresse) => adresse.id_adresse === id) || null;

    return {
        ...order,
        adresse_livraison: findAddress(order.id_adresse_livraison),
        adresse_facturation: findAddress(order.id_adresse_facturation),
        livraison: livraisons[0] || null,
        lignes,
    };
};

// Liste des commandes pour le personnel, avec filtres facultatifs
const getAllOrders = async ({ status, mode }) => {
    const conditions = [];
    const params = [];
    if (status) {
        conditions.push("c.statut_commande = ?");
        params.push(status);
    }
    if (mode) {
        conditions.push("c.mode_commande = ?");
        params.push(mode);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await db.query(
        `SELECT c.num_commande, c.statut_commande, c.mode_commande, c.date_commande, c.mode_paiement,
                c.total, c.date_paiement, c.code_client, cl.nom_client, cl.prenom_client
         FROM commande c
         JOIN client cl ON cl.code_client = c.code_client
         ${where}
         ORDER BY c.date_commande DESC
         LIMIT 200`,
        params
    );
    return rows;
};

// Changer le statut d'une commande, uniquement depuis le statut attendu
// (la condition sur l'ancien statut évite qu'une mise à jour concurrente soit écrasée)
const updateOrderStatus = async (orderId, fromStatus, toStatus) => {
    const [result] = await db.query(
        "UPDATE commande SET statut_commande = ? WHERE num_commande = ? AND statut_commande = ?",
        [toStatus, orderId, fromStatus]
    );
    return result.affectedRows;
};

module.exports = {
    OrderError,
    createOrder,
    getOrdersByClient,
    getOrderById,
    getAllOrders,
    updateOrderStatus,
};
