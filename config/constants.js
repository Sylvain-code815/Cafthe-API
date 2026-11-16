// Règles métier centralisées

// Rôles portés par le token JWT
const ROLES = {
    CLIENT: "ROLE_CLIENT",
    SELLER: "ROLE_SELLER",
    ADMIN: "ROLE_ADMIN",
};

// Personnel du magasin (vendeur + administrateur)
const STAFF_ROLES = [ROLES.SELLER, ROLES.ADMIN];

// Catégories du catalogue et taux de TVA (5,5 % thé et café, 20 % accessoires)
const VAT_BY_CATEGORY = {
    "Thé": 5.5,
    "Café": 5.5,
    "Accessoire": 20,
};

// Types de vente à l'unité. Tous les autres (Vrac, Grain, Moulu...) sont vendus
// au poids : le prix est alors un prix pour 100 g
const UNIT_SALE_TYPES = ["Sachet", "Boite", "Unité"];
const WEIGHT_UNIT_GRAMS = 100;

// Cycle de vie d'une commande :
// pending -> preparing -> shipped -> delivered
const ORDER_STATUS_FLOW = ["pending", "preparing", "shipped", "delivered"];

const ORDER_MODES = {
    WEB: "web",
    STORE: "store",
};

// Moyens de paiement acceptés selon le canal
// in_store = paiement différé au moment du retrait en magasin
const WEB_PAYMENT_MODES = ["card", "paypal", "in_store"];
const STORE_PAYMENT_MODES = ["card", "cash", "check"];

// Modes de livraison : prix et délai maximal en jours
// pickup = retrait en magasin (pas d'adresse, pas de bon de livraison)
const DELIVERY_MODES = {
    standard: { price: 4.99, days: 5 },
    express: { price: 9.99, days: 2 },
    free: { price: 0, days: 7 },
    pickup: { price: 0, days: 0 },
};

module.exports = {
    ROLES,
    STAFF_ROLES,
    VAT_BY_CATEGORY,
    UNIT_SALE_TYPES,
    WEIGHT_UNIT_GRAMS,
    ORDER_STATUS_FLOW,
    ORDER_MODES,
    WEB_PAYMENT_MODES,
    STORE_PAYMENT_MODES,
    DELIVERY_MODES,
};
