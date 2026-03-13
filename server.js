const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

require('dotenv').config(); // Sert à charger les var d'en depuis .env

//Connexion à la bdd (base de données)
const db = require('./db');

//Importation des routes
const articleRoutes = require('./article/routes/ArticleRouter');
const clientRoutes = require('./client/routes/ClientRouter');
const promotionRoutes = require('./promotion/routes/PromotionRouter');
const adresseRoutes = require('./adresse/routes/AdresseRouter');

//Création à l'application Express
const app = express();

//Middlewares
// Parser les JSON
app.use(express.json());

// Logger de requêtes HTTP dans la console
app.use(morgan("dev"));

// Sert les fichiers statiques (images, produits)
app.use('/images', express.static('public/images'));

// Permet les requêtes cross-origin (qui viennent du front)
// CORS = Cross-Origin Ressource Sharing
// Obligatoire sinon le navigateur bloque les requêtes

// Acceptation de la deuxième adresse et de la virgule de mon JSON, transformation en tableau
const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')
    : ['http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
}));

// Parse les cookies dans req
app.use(cookieParser());

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
app.use("/api/promotions", promotionRoutes);
app.use("/api/adresses", adresseRoutes);

// Gestion des erreurs
// Route 404
app.use((req, res) => {
    res.status(404).json({
        message: 'Road not Found',
    })
});

// Démarrage du serveur
const port = process.env.PORT || 3000;
const host = process.env.HOST || "localhost";

app.listen(port, host, () => {
    console.log(`Serveur démarré sur http://${host}:${port}`);
});