// Tests unitaires du contenu de l'email de confirmation de commande
const { buildOrderConfirmationEmail } = require("../order/orderConfirmationEmail");

const baseOrder = {
    num_commande: 42,
    email: "marie.dupont@email.com",
    prenom_client: "Marie",
    mode_paiement: "card",
    total: "47.49",
    adresse_livraison: { rue: "1 rue des Lilas", cp: "41000", ville: "Blois", pays: "France" },
    livraison: { choix_transporteur: "standard", delai_livraison: 5 },
    lignes: [
        { nom_produit: "Robusta", type_vente: "Unité", quantite: 2, sous_total: "12.50" },
        { nom_produit: "Thé Noir Darjeeling", type_vente: "Vrac", quantite: 5, sous_total: "30.00" },
    ],
};

describe("buildOrderConfirmationEmail", () => {
    test("destinataire, objet avec le numéro de commande et salutation", () => {
        const mail = buildOrderConfirmationEmail(baseOrder);

        expect(mail.to).toBe("marie.dupont@email.com");
        expect(mail.subject).toBe("CafThé - Confirmation de votre commande n° 42");
        expect(mail.text).toMatch(/^Bonjour Marie,/);
    });

    test("lignes : quantité pour un produit à l'unité, poids en grammes pour un produit en vrac", () => {
        const { text } = buildOrderConfirmationEmail(baseOrder);

        expect(text).toContain("- Robusta (x 2) : 12,50 €");
        expect(text).toContain("- Thé Noir Darjeeling (500 g) : 30,00 €");
    });

    test("livraison à domicile : mode, frais, adresse, délai, paiement et total", () => {
        const { text } = buildOrderConfirmationEmail(baseOrder);

        expect(text).toContain("Livraison standard : 4,99 €");
        expect(text).toContain("Adresse de livraison : 1 rue des Lilas, 41000 Blois, France");
        expect(text).toContain("Livraison prévue sous 5 jours");
        expect(text).toContain("Paiement : Carte bancaire");
        expect(text).toContain("Total TTC : 47,49 €");
    });

    test("retrait en magasin payé au retrait : pas d'adresse ni de frais de port", () => {
        const { text } = buildOrderConfirmationEmail({
            ...baseOrder,
            mode_paiement: "in_store",
            adresse_livraison: null,
            livraison: null,
        });

        expect(text).toContain("Retrait en magasin : votre commande vous attend à la boutique CafThé");
        expect(text).toContain("Paiement : Paiement au retrait en magasin");
        expect(text).not.toContain("Adresse de livraison");
    });
});
