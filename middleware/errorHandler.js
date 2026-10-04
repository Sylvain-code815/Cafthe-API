// Gestionnaire d'erreurs global (dernier middleware de app.js)
// Attrape tout ce qui n'a pas été géré dans les contrôleurs.
// Express 5 transmet automatiquement ici les erreurs des fonctions async.

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    // Corps de requête JSON mal formé ou trop volumineux
    if (err.type === "entity.parse.failed") {
        return res.status(400).json({ message: "JSON invalide" });
    }
    if (err.type === "entity.too.large") {
        return res.status(413).json({ message: "Requête trop volumineuse" });
    }

    // On journalise le détail côté serveur, mais on ne l'envoie jamais au client
    // (une trace SQL donnerait des informations à un attaquant)
    console.error("Erreur non gérée :", err.message);
    res.status(500).json({ message: "Erreur interne du serveur" });
};

module.exports = errorHandler;
