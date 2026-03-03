const { getAdressesByClient, createAdresse, updateAdresse, deleteAdresse, getAdresseById } = require("../models/AdresseModel");

// Récupérer les adresses du client connecté
const getAll = async (req, res) => {
    try {
        const adresses = await getAdressesByClient(req.client.id);
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
    try {
        const { titre, rue, cp, ville, pays } = req.body;

        if (!rue || !cp || !ville) {
            return res.status(400).json({ message: "Rue, code postal et ville sont requis" });
        }

        const result = await createAdresse({
            code_client: req.client.id,
            titre, rue, cp, ville, pays,
        });

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
    try {
        const { id } = req.params;
        const { titre, rue, cp, ville, pays } = req.body;

        // Vérifier que l'adresse appartient au client
        const adresses = await getAdresseById(id);
        if (adresses.length === 0) {
            return res.status(404).json({ message: "Adresse non trouvée" });
        }
        if (adresses[0].code_client !== req.client.id) {
            return res.status(403).json({ message: "Accès refusé" });
        }

        await updateAdresse(id, { titre, rue, cp, ville, pays });
        res.json({ message: "Adresse mise à jour avec succès" });
    } catch (error) {
        console.error("Erreur mise à jour adresse:", error.message);
        res.status(500).json({ message: "Erreur lors de la mise à jour de l'adresse" });
    }
};

// Supprimer une adresse
const remove = async (req, res) => {
    try {
        const { id } = req.params;

        // Vérifier que l'adresse appartient au client
        const adresses = await getAdresseById(id);
        if (adresses.length === 0) {
            return res.status(404).json({ message: "Adresse non trouvée" });
        }
        if (adresses[0].code_client !== req.client.id) {
            return res.status(403).json({ message: "Accès refusé" });
        }

        await deleteAdresse(id);
        res.json({ message: "Adresse supprimée avec succès" });
    } catch (error) {
        console.error("Erreur suppression adresse:", error.message);
        res.status(500).json({ message: "Erreur lors de la suppression de l'adresse" });
    }
};

module.exports = { getAll, create, update, remove };
