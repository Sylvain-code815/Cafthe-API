// Tests unitaires des règles de prix (remise et vente au poids)
const { getEffectivePrice, isSoldByWeight } = require("../utils/pricing");

describe("getEffectivePrice", () => {
    test("applique la remise d'un produit en promotion", () => {
        expect(getEffectivePrice({ prix_ttc: "12.50", produit_promotion: 1, taux_remise: 50 })).toBe(6.25);
        expect(getEffectivePrice({ prix_ttc: "9.90", produit_promotion: 1, taux_remise: 20 })).toBe(7.92);
    });

    test("ignore la remise si le produit n'est pas en promotion", () => {
        expect(getEffectivePrice({ prix_ttc: "12.50", produit_promotion: 0, taux_remise: 50 })).toBe(12.5);
    });
});

describe("isSoldByWeight (même règle que le front)", () => {
    test.each(["Sachet", "Boite", "Unité"])("%s se vend à l'unité", (type) => {
        expect(isSoldByWeight(type)).toBe(false);
    });

    test.each(["Vrac", "Grain", "Dosette"])("%s se vend au poids", (type) => {
        expect(isSoldByWeight(type)).toBe(true);
    });
});
