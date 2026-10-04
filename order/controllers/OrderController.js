// Contrôleur Commandes : passage de commande (web et caisse), historique, suivi des statuts
const {
    OrderError,
    createOrder,
    getOrdersByClient,
    getOrderById,
    getAllOrders,
    updateOrderStatus,
} = require("../models/OrderModel");
const {
    ROLES,
    ORDER_STATUS_FLOW,
    ORDER_MODES,
    WEB_PAYMENT_MODES,
    STORE_PAYMENT_MODES,
    DELIVERY_MODES,
    WEIGHT_UNIT_GRAMS,
} = require("../../config/constants");
const { parseId, isIntInRange, isValidId } = require("../../utils/validators");

const MAX_LINES = 50;
const MAX_QUANTITY = 100;
const MAX_WEIGHT_GRAMS = 1000;

// Valide les lignes du panier et regroupe les doublons
// - produit à l'unité : { code_produit, quantite }
// - produit au poids  : { code_produit, quantite, poids } (poids en grammes, multiple de 100)
//   converti en tranches de 100 g : 2 sachets de 500 g -> quantite 10
// Renvoie { error } ou { lines: [{ code_produit, quantite, byWeight }] }
const parseLines = (lines) => {
    if (!Array.isArray(lines) || lines.length === 0 || lines.length > MAX_LINES) {
        return { error: `La commande doit contenir entre 1 et ${MAX_LINES} lignes` };
    }

    const merged = new Map();
    for (const line of lines) {
        if (!isValidId(line?.code_produit) || !isIntInRange(line?.quantite, 1, MAX_QUANTITY)) {
            return { error: `Chaque ligne doit avoir un code_produit valide et une quantite entre 1 et ${MAX_QUANTITY}` };
        }
        const byWeight = line.poids !== undefined && line.poids !== null;
        if (byWeight && (!isIntInRange(line.poids, WEIGHT_UNIT_GRAMS, MAX_WEIGHT_GRAMS) || line.poids % WEIGHT_UNIT_GRAMS !== 0)) {
            return { error: `Le poids doit être un multiple de ${WEIGHT_UNIT_GRAMS} g, entre ${WEIGHT_UNIT_GRAMS} et ${MAX_WEIGHT_GRAMS} g` };
        }

        const units = byWeight ? (line.poids / WEIGHT_UNIT_GRAMS) * line.quantite : line.quantite;
        const existing = merged.get(line.code_produit);
        if (existing && existing.byWeight !== byWeight) {
            return { error: `Le produit ${line.code_produit} est demandé à la fois au poids et à l'unité` };
        }
        merged.set(line.code_produit, {
            code_produit: line.code_produit,
            quantite: (existing?.quantite || 0) + units,
            byWeight,
        });
    }

    for (const line of merged.values()) {
        if (line.quantite > MAX_QUANTITY) {
            return { error: `Quantité maximale par produit dépassée (${MAX_QUANTITY} unités ou ${MAX_QUANTITY * WEIGHT_UNIT_GRAMS / 1000} kg)` };
        }
    }

    return { lines: [...merged.values()] };
};

// Construit une commande passée en ligne par un client connecté
// - livraison (standard / express / free) : adresse de livraison obligatoire
// - retrait en magasin (pickup) : pas d'adresse, paiement en ligne ou au retrait
const buildWebOrder = (clientId, body) => {
    const { mode_livraison, id_adresse_livraison, mode_paiement } = body;
    const delivery = DELIVERY_MODES[mode_livraison];

    if (!Object.hasOwn(DELIVERY_MODES, mode_livraison)) {
        return { error: `mode_livraison invalide (${Object.keys(DELIVERY_MODES).join(", ")})` };
    }
    if (!WEB_PAYMENT_MODES.includes(mode_paiement)) {
        return { error: `mode_paiement invalide (${WEB_PAYMENT_MODES.join(", ")})` };
    }

    const order = {
        codeClient: clientId,
        mode: ORDER_MODES.WEB,
        status: ORDER_STATUS_FLOW[0],
        paymentMode: mode_paiement,
        // Paiement en ligne simulé : l'intégration d'un prestataire (Stripe, PayPal)
        // sort du périmètre du projet. "in_store" = payé au retrait.
        paid: mode_paiement !== "in_store",
        deliveryMode: mode_livraison,
        deliveryDays: delivery.days,
        shippingCost: delivery.price,
        deliveryAddressId: null,
        billingAddressId: null,
    };

    if (mode_livraison === "pickup") {
        return { order };
    }

    if (!isValidId(id_adresse_livraison)) {
        return { error: "id_adresse_livraison obligatoire pour une livraison" };
    }
    if (mode_paiement === "in_store") {
        return { error: "Le paiement en magasin n'est possible que pour un retrait en magasin" };
    }
    // Adresse de facturation facultative : par défaut, la même que la livraison
    const billingId = body.id_adresse_facturation ?? id_adresse_livraison;
    if (!isValidId(billingId)) {
        return { error: "id_adresse_facturation invalide" };
    }

    order.deliveryAddressId = id_adresse_livraison;
    order.billingAddressId = billingId;
    return { order };
};

// Construit une vente en caisse saisie par un vendeur : payée et remise immédiatement
const buildStoreOrder = (body) => {
    const { code_client, mode_paiement } = body;

    if (!isValidId(code_client)) {
        return { error: "code_client obligatoire pour une vente en magasin" };
    }
    if (!STORE_PAYMENT_MODES.includes(mode_paiement)) {
        return { error: `mode_paiement invalide (${STORE_PAYMENT_MODES.join(", ")})` };
    }

    return {
        order: {
            codeClient: code_client,
            mode: ORDER_MODES.STORE,
            status: ORDER_STATUS_FLOW[ORDER_STATUS_FLOW.length - 1],
            paymentMode: mode_paiement,
            paid: true,
            deliveryMode: "pickup",
            deliveryDays: 0,
            shippingCost: 0,
            deliveryAddressId: null,
            billingAddressId: null,
        },
    };
};

// POST /api/orders - Passer une commande (client) ou enregistrer une vente en caisse (personnel)
const create = async (req, res) => {
    const body = req.body || {};

    const { lines, error: linesError } = parseLines(body.lines);
    if (linesError) {
        return res.status(400).json({ message: linesError });
    }

    // Le client d'une commande web vient du token, jamais du corps de la requête
    const { order, error } = req.user.role === ROLES.CLIENT
        ? buildWebOrder(req.user.id, body)
        : buildStoreOrder(body);
    if (error) {
        return res.status(400).json({ message: error });
    }

    try {
        const { num_commande, total } = await createOrder({ ...order, lines });
        res.status(201).json({
            message: "Commande enregistrée avec succès",
            num_commande,
            total,
            frais_livraison: order.shippingCost,
        });
    } catch (error) {
        // Erreur métier prévue (stock insuffisant, produit inconnu...)
        if (error instanceof OrderError) {
            return res.status(error.status).json({ message: error.message });
        }
        // Clé étrangère invalide : le client indiqué par le vendeur n'existe pas
        if (error.code === "ER_NO_REFERENCED_ROW_2") {
            return res.status(400).json({ message: "Client inconnu" });
        }
        console.error("Erreur enregistrement commande:", error.message);
        res.status(500).json({ message: "Erreur lors de l'enregistrement de la commande" });
    }
};

// GET /api/orders/me - Historique des commandes du client connecté (web + magasin)
const getMine = async (req, res) => {
    try {
        const commandes = await getOrdersByClient(req.user.id);
        res.json({ message: "Commandes récupérées avec succès", count: commandes.length, commandes });
    } catch (error) {
        console.error("Erreur récupération commandes:", error.message);
        res.status(500).json({ message: "Erreur lors de la récupération des commandes" });
    }
};

// GET /api/orders/:id - Détail d'une commande
// Un client ne voit que ses propres commandes, le personnel les voit toutes
const getById = async (req, res) => {
    const orderId = parseId(req.params.id);
    if (!orderId) {
        return res.status(400).json({ message: "Identifiant de commande invalide" });
    }

    try {
        const commande = await getOrderById(orderId);

        // 404 (et non 403) si la commande appartient à un autre client :
        // on ne confirme pas l'existence d'une commande qui ne nous appartient pas
        const isOwner = commande && commande.code_client === req.user.id;
        if (!commande || (req.user.role === ROLES.CLIENT && !isOwner)) {
            return res.status(404).json({ message: "Commande non trouvée" });
        }

        res.json({ message: "Commande récupérée avec succès", commande });
    } catch (error) {
        console.error("Erreur récupération commande:", error.message);
        res.status(500).json({ message: "Erreur lors de la récupération de la commande" });
    }
};

// GET /api/orders?status=pending&mode=web - Liste des commandes (personnel)
const getAll = async (req, res) => {
    const { status, mode } = req.query;

    if (status !== undefined && !ORDER_STATUS_FLOW.includes(status)) {
        return res.status(400).json({ message: `status invalide (${ORDER_STATUS_FLOW.join(", ")})` });
    }
    if (mode !== undefined && !Object.values(ORDER_MODES).includes(mode)) {
        return res.status(400).json({ message: `mode invalide (${Object.values(ORDER_MODES).join(", ")})` });
    }

    try {
        const commandes = await getAllOrders({ status, mode });
        res.json({ message: "Commandes récupérées avec succès", count: commandes.length, commandes });
    } catch (error) {
        console.error("Erreur récupération commandes:", error.message);
        res.status(500).json({ message: "Erreur lors de la récupération des commandes" });
    }
};

// PUT /api/orders/:id/status - Faire avancer le statut d'une commande (personnel)
// Seule l'étape suivante est autorisée : pending -> preparing -> shipped -> delivered
const updateStatus = async (req, res) => {
    const orderId = parseId(req.params.id);
    if (!orderId) {
        return res.status(400).json({ message: "Identifiant de commande invalide" });
    }
    const { statut_commande } = req.body || {};
    if (!ORDER_STATUS_FLOW.includes(statut_commande)) {
        return res.status(400).json({ message: `statut_commande invalide (${ORDER_STATUS_FLOW.join(", ")})` });
    }

    try {
        const commande = await getOrderById(orderId);
        if (!commande) {
            return res.status(404).json({ message: "Commande non trouvée" });
        }

        const currentIndex = ORDER_STATUS_FLOW.indexOf(commande.statut_commande);
        const expectedNext = ORDER_STATUS_FLOW[currentIndex + 1];
        if (statut_commande !== expectedNext) {
            return res.status(409).json({
                message: expectedNext
                    ? `Transition impossible : le statut suivant de "${commande.statut_commande}" est "${expectedNext}"`
                    : "Cette commande est déjà livrée",
            });
        }

        const affectedRows = await updateOrderStatus(orderId, commande.statut_commande, statut_commande);
        if (affectedRows === 0) {
            return res.status(409).json({ message: "La commande a été modifiée entre-temps, réessayez" });
        }

        res.json({
            message: "Statut de la commande mis à jour",
            commande: { num_commande: orderId, statut_commande },
        });
    } catch (error) {
        console.error("Erreur mise à jour statut:", error.message);
        res.status(500).json({ message: "Erreur lors de la mise à jour du statut" });
    }
};

module.exports = { create, getMine, getById, getAll, updateStatus };
