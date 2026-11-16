// Email de confirmation envoyé au client après une commande en ligne
const { isSoldByWeight } = require("../utils/pricing");
const { DELIVERY_MODES, WEIGHT_UNIT_GRAMS } = require("../config/constants");

const DELIVERY_LABELS = {
    standard: "Livraison standard",
    express: "Livraison express",
    free: "Livraison offerte",
    pickup: "Retrait en magasin",
};

const PAYMENT_LABELS = {
    card: "Carte bancaire",
    paypal: "PayPal",
    in_store: "Paiement au retrait en magasin",
};

// mysql2 renvoie les DECIMAL sous forme de texte ("12.50")
const formatEuros = (value) => `${Number(value).toFixed(2).replace(".", ",")} €`;

// Produit au poids : la quantité est stockée en tranches de 100 g
const formatQuantity = (ligne) => (isSoldByWeight(ligne.type_vente)
    ? `${ligne.quantite * WEIGHT_UNIT_GRAMS} g`
    : `x ${ligne.quantite}`);

const formatAddress = (adresse) => `${adresse.rue}, ${adresse.cp} ${adresse.ville}${adresse.pays ? `, ${adresse.pays}` : ""}`;

const buildOrderConfirmationEmail = (order) => {
    const deliveryMode = order.livraison?.choix_transporteur || "pickup";
    const shippingCost = DELIVERY_MODES[deliveryMode]?.price ?? 0;

    const lines = order.lignes.map((ligne) =>
        `- ${ligne.nom_produit} (${formatQuantity(ligne)}) : ${formatEuros(ligne.sous_total)}`);

    const delivery = order.adresse_livraison
        ? [
            `${DELIVERY_LABELS[deliveryMode] || deliveryMode} : ${formatEuros(shippingCost)}`,
            `Adresse de livraison : ${formatAddress(order.adresse_livraison)}`,
            `Livraison prévue sous ${order.livraison.delai_livraison} jours`,
        ]
        : [`${DELIVERY_LABELS.pickup} : votre commande vous attend à la boutique CafThé`];

    return {
        to: order.email,
        subject: `CafThé - Confirmation de votre commande n° ${order.num_commande}`,
        text: [
            `Bonjour ${order.prenom_client},`,
            "",
            `Merci pour votre commande n° ${order.num_commande}. Voici son récapitulatif :`,
            "",
            ...lines,
            "",
            ...delivery,
            `Paiement : ${PAYMENT_LABELS[order.mode_paiement] || order.mode_paiement}`,
            `Total TTC : ${formatEuros(order.total)}`,
            "",
            "Vous pouvez suivre son avancement dans votre espace client, rubrique « Mes commandes ».",
            "",
            "L'équipe CafThé",
        ].join("\n"),
    };
};

module.exports = { buildOrderConfirmationEmail };
