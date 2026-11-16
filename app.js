// Application Express : middlewares, routes et gestion des erreurs

require('dotenv').config({ quiet: true }); // Charge les variables du fichier .env

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const YAML = require('yaml');
const swaggerUi = require('swagger-ui-express');

const articleRoutes = require('./article/routes/ArticleRouter');
const clientRoutes = require('./client/routes/ClientRouter');
const promotionRoutes = require('./promotion/routes/PromotionRouter');
const adresseRoutes = require('./adresse/routes/AdresseRouter');
const orderRoutes = require('./order/routes/OrderRouter');
const employeeRoutes = require('./employee/routes/EmployeeRouter');
const dashboardRoutes = require('./dashboard/routes/DashboardRouter');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Derrière le reverse proxy : récupère la vraie IP du visiteur
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// En-têtes HTTP de sécurité (anti-clickjacking, anti-sniffing MIME, HSTS...)
app.use(helmet({
    // Images produits affichées par le front
    crossOriginResourcePolicy: { policy: 'same-site' },
    contentSecurityPolicy: {
        directives: {
            // HTTPS non imposé en développement
            upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
        },
    },
}));

// Taille du JSON limitée
app.use(express.json({ limit: '100kb' }));

// Logger de requêtes HTTP (désactivé pendant les tests)
if (process.env.NODE_ENV !== 'test') {
    app.use(morgan("dev"));
}

app.use('/images', express.static(path.join(__dirname, 'public', 'images')));

// CORS : autorise les requêtes du front

// Liste des URL autorisées (séparées par une virgule)
const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',').map((url) => url.trim())
    : ['http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    // Autorise l'envoi du cookie d'authentification
    credentials: true
}));

app.use(cookieParser());

app.get("/health", (req, res) => {
    res.json({
        status: "OK",
        message: "API is running",
    })
});

const openApiDocument = YAML.parse(fs.readFileSync(path.join(__dirname, 'docs', 'openapi.yaml'), 'utf8'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.use("/api/articles", articleRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/promotions", promotionRoutes);
app.use("/api/adresses", adresseRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use((req, res) => {
    res.status(404).json({
        message: 'Route not found',
    })
});

// Erreurs non prévues
app.use(errorHandler);

module.exports = app;
