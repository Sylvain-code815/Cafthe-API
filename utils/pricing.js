// Calculs de prix partagés par le catalogue et les commandes
const { UNIT_SALE_TYPES } = require("../config/constants");

// Arrondi monétaire à 2 décimales
const roundPrice = (value) => Math.round(value * 100) / 100;

// Prix réellement payé : prix TTC moins la remise si le produit est en promotion
// (même règle que l'affichage du front : produit_promotion = 1 et taux_remise > 0)
const getEffectivePrice = (product) => {
    const price = Number(product.prix_ttc);
    if (Number(product.produit_promotion) === 1 && product.taux_remise > 0) {
        return roundPrice(price * (1 - product.taux_remise / 100));
    }
    return roundPrice(price);
};

// true si le produit est vendu au poids (prix pour 100 g)
const isSoldByWeight = (typeVente) => !UNIT_SALE_TYPES.includes(typeVente);

module.exports = { roundPrice, getEffectivePrice, isSoldByWeight };
