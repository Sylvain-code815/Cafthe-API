const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

require('dotenv').config(); // Sert à charger les var d'en depuis .env

//Connexion à la bdd (base de données)
const db = require('./db');

//Importation des routes
const articleRoutes = require('./article/routes/ArticleRouter');
const clientRoutes = require('./client/routes/ClientRouter');

//Création à l'application Express
const app = express();

//Middlewares
// Parser les JSON
app.use(express.json());

// Logger de requêtes HTTP dans la console
app.use(morgan("dev"));

// Permet les requêtes cross-origin (qui viennent du front)
// CORS = Cross-Origin Ressource Sharing
// Obligatoire sinon le navigateur bloque les requêtes

app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173 ',
    methods: ['GET', 'POST', 'PUT', 'DELETE']
}),
);

// ROUTES

// Route de test pour vérifier que l'api fonctionne
app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        mesage: "API is running",
    })
});

// Routes de l'API
app.use("/api/articles", articleRoutes);
app.use("/api/clients", clientRoutes);

// Gestion des erreurs
// Route 404
app.use((req, res) => {
    res.status(404).json({
        message: 'Road not Found',
    })
});

// Démarrage du serveur
const port = process.env.PORT || 3000;
const host = process.env.Host || "localhost";

app.listen(port, host, () => {
    console.log(`Serveur démarré sur http://${host}:${port}`);
});