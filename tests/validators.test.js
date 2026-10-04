// Tests unitaires des fonctions de validation des entrées
const {
    normalizeEmail,
    parseId,
    isValidEmail,
    isStrongPassword,
    isValidPhone,
    isValidPrice,
} = require("../utils/validators");

describe("parseId", () => {
    test("accepte un entier positif", () => {
        expect(parseId("5")).toBe(5);
    });

    test.each(["0", "-1", "1.5", "5abc", "1 OR 1=1", "", "99999999999"])(
        "refuse la valeur %p",
        (value) => {
            expect(parseId(value)).toBeNull();
        }
    );
});

describe("isValidEmail / normalizeEmail", () => {
    test("accepte un email valide et le normalise", () => {
        expect(isValidEmail("marie.dupont@email.com")).toBe(true);
        expect(normalizeEmail("  Marie.Dupont@Email.com ")).toBe("marie.dupont@email.com");
    });

    test.each(["marie", "marie@", "@email.com", "marie dupont@email.com", 42])("refuse %p", (value) => {
        expect(isValidEmail(value)).toBe(false);
    });
});

describe("isStrongPassword (recommandation CNIL)", () => {
    test("accepte 12 caractères avec majuscule, minuscule, chiffre et spécial", () => {
        expect(isStrongPassword("CafThe#2026test")).toBe(true);
    });

    test.each([
        ["trop court", "Ab1!abc"],
        ["sans majuscule", "cafthe#2026test"],
        ["sans minuscule", "CAFTHE#2026TEST"],
        ["sans chiffre", "CafThe#testtest"],
        ["sans caractère spécial", "CafThe2026test"],
    ])("refuse un mot de passe %s", (label, value) => {
        expect(isStrongPassword(value)).toBe(false);
    });
});

describe("isValidPhone / isValidPrice", () => {
    test("téléphone français à 10 chiffres", () => {
        expect(isValidPhone("0601020304")).toBe(true);
        expect(isValidPhone("601020304")).toBe(false);
        expect(isValidPhone("06 01 02 03 04")).toBe(false);
    });

    test("prix positif à 2 décimales maximum", () => {
        expect(isValidPrice(15.9)).toBe(true);
        // Cas réel : 17.06 * 100 = 1705.9999999999998 en virgule flottante
        expect(isValidPrice(17.06)).toBe(true);
        expect(isValidPrice(-1)).toBe(false);
        expect(isValidPrice(1.999)).toBe(false);
        expect(isValidPrice("15.90")).toBe(false);
    });
});

describe("normalizeText (catégories du front)", () => {
    const { normalizeText } = require("../utils/validators");

    test("ignore accents et majuscules", () => {
        expect(normalizeText("Thé")).toBe(normalizeText("the"));
        expect(normalizeText("Café")).toBe(normalizeText("Cafe"));
    });
});
