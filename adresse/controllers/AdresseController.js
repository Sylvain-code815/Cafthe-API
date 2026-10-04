const {
    getAdressesByClient,
    getAdresseById,
    createAdresse,
    updateAdresse,
    isAdresseUsedByOrder,
    deleteAdresse,
} = require("../models/AdresseModel");
const { parseId, isNonEmptyString, isValidPostalCode, validationError } = require("../../utils/validators");

// Valide et nettoie une adresse (titre et pays facultatifs)
// Renvoie { errors } ou { adresse }
const buildAdresse = ({ titre, rue, cp, ville, pays }) => {
    const errors = [];
    if (titre !== undefined && titre !== "" && !isNonEmptyString(titre, 50)) errors.push("Le titre fait 50 caractères maximum");
    if (!isNonEmptyString(rue, 255)) errors.push("La rue est requise (255 caractères max)");
    if (!isValidPostalCode(cp)) errors.push("Le code postal est invalide");
    if (!isNonEmptyString(ville, 100)) errors.push("La ville est requise (100 caractères max)");
    if (pays !== undefined && pays !== "" && !isNonEmptyString(pays, 50)) errors.push("Le pays fait 50 caractères maximum");
    if (errors.length > 0) return { errors };

    return {
        adresse: {
            titre: titre ? titre.trim() : "Domicile",
            rue: rue.trim(),
            cp: cp.trim(),
            ville: ville.trim(),
            pays: pays ? pays.trim() : "France",
        },
    };
};

// Récupérer les adresses du client connecté
const getAll = async (req, res) => {
    try {
        const adresses = await getAdressesByClient(req.user.id);
        res.json({
            message: "Adresses récupérées avec succès",
            count: adresses.length,
            adresses,
        });
    } catch (error) {
        console.error("Erreur récupération adresses:", error.message);
        res.status(500).json({ message: "Erreur lors de la récupération des adresses" });
    }
};

// Créer une adresse
const create = async (req, res) => {
    const { adresse, errors } = buildAdresse(req.body || {});
    if (errors) {
        return validationError(res, errors);
    }

    try {
        const result = await createAdresse({ code_client: req.user.id, ...adresse });

        res.status(201).json({
            message: "Adresse créée avec succès",
            adresse_id: result.insertId,
        });
    } catch (error) {
        console.error("Erreur création adresse:", error.message);
        res.status(500).json({ message: "Erreur lors de la création de l'adresse" });
    }
};

// Modifier une adresse
const update = async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) {
        return res.status(400).json({ message: "Identifiant d'adresse invalide" });
    }
    const { adresse, errors } = buildAdresse(req.body || {});
    if (errors) {
        return validationError(res, errors);
    }

    try {
        // Le filtre sur le client connecté empêche de modifier l'adresse d'un autre client :
        // l'adresse d'un autre est traitée comme inexistante (404, pas de fuite d'information)
        const result = await updateAdresse(id, req.user.id, adresse);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Adresse non trouvée" });
        }
        res.json({ message: "Adresse mise à jour avec succès" });
    } catch (error) {
        console.error("Erreur mise à jour adresse:", error.message);
        res.status(500).json({ message: "Erreur lors de la mise à jour de l'adresse" });
    }
};

// Supprimer une adresse
const remove = async (req, res) => {
    const id = parseId(req.params.id);
    if (!id) {
        return res.status(400).json({ message: "Identifiant d'adresse invalide" });
    }

    try {
        // Vérifier que l'adresse appartient au client
        const adresses = await getAdresseById(id, req.user.id);
        if (adresses.length === 0) {
            return res.status(404).json({ message: "Adresse non trouvée" });
        }
        if (await isAdresseUsedByOrder(id)) {
            return res.status(409).json({ message: "Adresse utilisée par une commande : suppression impossible" });
        }

        await deleteAdresse(id, req.user.id);
        res.json({ message: "Adresse supprimée avec succès" });
    } catch (error) {
        console.error("Erreur suppression adresse:", error.message);
        res.status(500).json({ message: "Erreur lors de la suppression de l'adresse" });
    }
};

module.exports = { getAll, create, update, remove };
