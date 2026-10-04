// Point d'entrée du serveur : démarre l'application définie dans app.js

require('dotenv').config({ quiet: true }); // Sert à charger les var d'en depuis .env

// Sans clé secrète, aucun token JWT ne peut être signé : on refuse de démarrer
if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET manquant dans le fichier .env : démarrage annulé");
    process.exit(1);
}

//Connexion à la bdd (base de données) : vérifiée dès le démarrage
require('./db');

const app = require('./app');

// Démarrage du serveur
const port = process.env.PORT || 3000;
const host = process.env.HOST || "localhost";

app.listen(port, host, () => {
    console.log(`Serveur démarré sur http://${host}:${port}`);
});
