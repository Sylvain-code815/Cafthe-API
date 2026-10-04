// Contrôleur du tableau de bord : regroupe les KPI en une seule réponse
const {
    getRevenue,
    getSalesSummary,
    getTopProducts,
    getSalesByCategory,
    getNewClientsByMonth,
} = require("../models/DashboardModel");

// GET /api/dashboard/kpi (vendeur / administrateur)
const getKpi = async (req, res) => {
    try {
        // Les 5 requêtes sont indépendantes : on les lance en parallèle
        const [chiffreAffaires, ventes, topProduits, ventesParCategorie, nouveauxClients] = await Promise.all([
            getRevenue(),
            getSalesSummary(),
            getTopProducts(),
            getSalesByCategory(),
            getNewClientsByMonth(),
        ]);

        res.json({
            message: "Indicateurs récupérés avec succès",
            kpi: {
                chiffre_affaires: chiffreAffaires,
                nombre_ventes: ventes.nombre_ventes,
                panier_moyen: ventes.panier_moyen,
                top_produits: topProduits,
                ventes_par_categorie: ventesParCategorie,
                nouveaux_clients_par_mois: nouveauxClients,
            },
        });
    } catch (error) {
        console.error("Erreur de calcul des indicateurs", error.message);
        res.status(500).json({ message: "Erreur de calcul des indicateurs" });
    }
};

module.exports = { getKpi };
