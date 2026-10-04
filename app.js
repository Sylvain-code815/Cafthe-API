// Application Express : middlewares, routes et gestion des erreurs
// (séparée de server.js pour pouvoir la tester avec Supertest sans ouvrir de port)

require('dotenv').config({ quiet: true }); // Sert à charger les var d'en depuis .env

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const swaggerUi = require('swagger-ui-express');

//Importation des routes
const articleRoutes = require('./article/routes/ArticleRouter');
const clientRoutes = require('./client/routes/ClientRouter');
const promotionRoutes = require('./promotion/routes/PromotionRouter');
const adresseRoutes = require('./adresse/routes/AdresseRouter');
const orderRoutes = require('./order/routes/OrderRouter');
const employeeRoutes = require('./employee/routes/EmployeeRouter');
const dashboardRoutes = require('./dashboard/routes/DashboardRouter');
const errorHandler = require('./middleware/errorHandler');

//Création à l'application Express
const app = express();

// En production l'API est derrière le reverse proxy HTTPS (Plesk) :
// on lui fait confiance pour connaître la vraie IP du visiteur (limitation des tentatives)
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

//Middlewares
// En-têtes HTTP de sécurité (anti-clickjacking, anti-sniffing MIME, HSTS...)
app.use(helmet({
    // Les images produits sont affichées par le front (autre sous-domaine du même site)
    crossOriginResourcePolicy: { policy: 'same-site' },
    contentSecurityPolicy: {
        directives: {
            // En développement (HTTP), on n'impose pas le passage en HTTPS des ressources de /api-docs
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
    },
}));

// Parser les JSON (taille limitée pour éviter les payloads géants)
app.use(express.json({ limit: '100kb' }));

// Logger de requêtes HTTP dans la console (désactivé pendant les tests)
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan("dev"));
}

// Sert les fichiers statiques (images, produits)
app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// Permet les requêtes cross-origin (qui viennent du front)
// CORS = Cross-Origin Ressource Sharing
// Obligatoire sinon le navigateur bloque les requêtes

// Acceptation de la deuxième adresse et de la virgule de mon JSON, transformation en tableau
const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((url) => url.trim())
    : ['http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    // Autorise l'envoi du cookie d'authentification (fetch ... credentials: "include")
    credentials: true
}));

// Parse les cookies dans req
app.use(cookieParser());

// ROUTES

// Route de test pour vérifier que l'api fonctionne
app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        message: "API is running",
    })
});

// Documentation interactive de l'API (Swagger / OpenAPI)
const openApiDocument = YAML.parse(fs.readFileSync(path.join(__dirname, 'docs', 'openapi.yaml'), 'utf8'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

// Routes de l'API
app.use("/api/articles", articleRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/adresses", adresseRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/dashboard", dashboardRoutes);

// Gestion des erreurs
// Route 404
app.use((req, res) => {
    res.status(404).json({
        message: 'Route not found',
    })
});

// Erreurs non prévues (JSON mal formé, exception non attrapée...)
app.use(errorHandler);

module.exports = app;
