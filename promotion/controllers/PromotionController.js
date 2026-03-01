const { getAllPromotions, getActivePromotions, getPromotionById } = require("../models/PromotionModel");

// Récupérer toutes les promotions
const getAll = async (req, res) => {
    try {
        const promotions = await getAllPromotions();
        res.json({
            message: "Promotions récupérées avec succès",
            count: promotions.length,
            promotions,
        });
    } catch (error) {
        console.error("Erreur récupération promotions:", error.message);
        res.status(500).json({ message: "Erreur lors de la récupération des promotions" });
    }
};

// Récupérer les promotions actives
const getActive = async (req, res) => {
    try {
        const promotions = await getActivePromotions();
        res.json({
            message: "Promotions actives récupérées avec succès",
            count: promotions.length,
            promotions,
        });
    } catch (error) {
        console.error("Erreur récupération promotions actives:", error.message);
        res.status(500).json({ message: "Erreur lors de la récupération des promotions actives" });
    }
};

// Récupérer une promotion par son id
const getById = async (req, res) => {
    try {
        const { id } = req.params;
        const promotions = await getPromotionById(id);

        if (promotions.length === 0) {
            return res.status(404).json({ message: "Promotion non trouvée" });
        }

        res.json({
            message: "Promotion récupérée avec succès",
            promotion: promotions[0],
        });
    } catch (error) {
        console.error("Erreur récupération promotion:", error.message);
        res.status(500).json({ message: "Erreur lors de la récupération de la promotion" });
    }
};

module.exports = { getAll, getActive, getById };
