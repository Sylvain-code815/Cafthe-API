// Il permet de configurer le pool de connexions à MySQL
// mysql2 pour faire des requêtes asynchrones async/await

const mysql = require("mysql2/promise");
require("dotenv").config();

// Pool de connexions, permet de :
// Gérer plusieurs connexions simultanées
// Réutiliser des connexions existantes
// Gestion automatique de la disponiilité
// Limiter le nombre de connexions simultanées

const db = mysql.createPool({
    // Paramètres de connexion (host, nom d'utilisateur, mdp, nom bdd)
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,

    // Paramètre du pool
    // Si plus de connexion dispo, alors elles attendent
    waitForConnections: true,
    // Limiter le nombre max de connexions
    connectionLimit: 10,

    // Paramètres optionnels mais recommandés
    // En cas d'échec de co, réessayer
    enableKeepAlive: true,
    KeepAliveInitialDelay: 0,
    // timeout de connexion (millisecondes)
    connectTimeout: 10000, // 10s
});

(async () => {
   try {
       const connection = await db.getConnection();
       console.log("Connecté à la base de données MySQL");

       // se déconnecte
       connection.release();
   } catch (err){
       console.error("Erreur de connection à MySQL : ", err.message)

       // arrête l'application avec code erreur 1
       process.exit(1);
   }
})()

module.exports = db;