// Gestionnaire d'erreurs global (dernier middleware)

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    // Corps de requête JSON mal formé ou trop volumineux
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ message: "JSON invalide" });
    }
    if (err.type === "entity.too.large") {
        return res.status(413).json({ message: "Requête trop volumineuse" });
    }

    // Détail journalisé côté serveur, jamais envoyé au client
    console.error("Erreur non gérée :", err.message);
    res.status(500).json({ message: "Erreur interne du serveur" });
};

module.exports = errorHandler;
