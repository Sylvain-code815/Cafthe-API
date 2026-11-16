// Pool de connexions MySQL (mysql2, async/await)

const mysql = require("mysql2/promise");
require("dotenv").config({ quiet: true });

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: 'utf8mb4',

    // Attente si aucune connexion n'est disponible
    waitForConnections: true,
    connectionLimit: 10,

    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    connectTimeout: 10000, // 10 s
});

(async () => {
   try {
       const connection = await db.getConnection();
       console.log("Connecté à la base de données MySQL");

       connection.release();
   } catch (err){
       console.error("Erreur de connection à MySQL : ", err.message)

       process.exit(1);
   }
})()

module.exports = db;