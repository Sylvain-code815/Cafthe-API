# CafThé API

API REST de la plateforme e-commerce CafThé : catalogue, comptes clients, carnet d'adresses,
commandes web et ventes en caisse, gestion des vendeurs et indicateurs du tableau de bord.
Front-end associé : [cafthereact](https://github.com/Sylvain-code815/cafthereact).

**Technologies :** Node.js 20+, Express 5, MySQL 8 / MariaDB (driver `mysql2`), JWT en cookie HttpOnly,
bcryptjs, Jest + Supertest.

## Architecture

```
server.js            Démarrage : vérifie JWT_SECRET et la connexion BDD, ouvre le port
app.js               Application Express : sécurité, CORS, routes, gestion des erreurs
db.js                Pool de connexions MySQL
config/constants.js  Règles métier (rôles, TVA, statuts, paiements, livraison, vente au poids)
utils/               Validation des entrées, mots de passe (bcrypt), token JWT, calcul des prix
middleware/          Vigile JWT + rôles, limitation des tentatives, erreurs globales
article/ client/ adresse/ promotion/ order/ employee/ dashboard/
    routes/          "Le Standardiste" : URL + verbe HTTP -> contrôleur
    controllers/     "Le Chef d'orchestre" : validation, règles métier, réponse HTTP
    models/          "L'Archiviste" : requêtes SQL préparées
database/            Création complète de la base, migration d'une base existante, utilisateur MySQL
scripts/             Hachage des mots de passe restés en clair
docs/                OpenAPI (servi sur /api-docs) et justification des choix pour le dossier
tests/               Tests unitaires, d'intégration et de sécurité (Jest)
public/images/       Images des produits, servies sur /images/<fichier>
```

## Installation en local

1. Installer les dépendances : `npm install`
2. Base de données (MySQL ou MariaDB démarré ; avec WAMP, MariaDB écoute sur le port 3307) :
   ```bash
   mysql -u root -p < database/cafthe.sql        # crée la base "cafthe" + jeu de test
   mysql -u root -p < database/create_user.sql   # changer le mot de passe dans le fichier avant
   ```
3. Copier `.env.example` en `.env` et le remplir (dont `JWT_SECRET`).
4. Lancer : `npm run dev` (rechargement automatique) ou `npm start`.
5. Vérifier : `http://localhost:3000/health`, documentation sur `http://localhost:3000/api-docs`.

### Comptes de test (`database/cafthe.sql`)

Mot de passe commun : `CafThe#2026test`

| Rôle | Identifiant | Route de connexion |
|---|---|---|
| Administrateur | admin@cafthe.com | `POST /api/employees/login` |
| Vendeur | paul.durand@cafthe.com | `POST /api/employees/login` |
| Client | marie.dupont@email.com | `POST /api/clients/login` |
| Client créé en boutique (sans mot de passe) | sophie.lefebvre@email.com / 0755443322 | `POST /api/clients/activate` |

## Tests

```bash
npm test               # 110 tests : validation, prix, vigile JWT, routes, transaction de commande
npm run test:coverage  # avec le taux de couverture
```

La base de données est simulée (mocks Jest) : les tests ne nécessitent pas MySQL et ne modifient aucune donnée.

## Routes

| Verbe | Route | Accès |
|---|---|---|
| GET | `/api/articles` (`?category, search, minPrice, maxPrice, featured, onSale, sort, page, limit`) | Public |
| GET | `/api/articles/promo`, `/phare`, `/categorie/:categorie`, `/:id` | Public |
| POST / PUT / DELETE | `/api/articles`, `/api/articles/:id` | Administrateur |
| POST | `/api/clients/register`, `/login`, `/activate` | Public (10 essais / 15 min) |
| POST | `/api/clients/logout` | Tous |
| GET / PUT | `/api/clients/me`, PUT `/api/clients/me/password` | Client |
| GET / POST / PUT / DELETE | `/api/adresses[/:id]` | Client |
| GET `?search=` / POST | `/api/clients` | Vendeur, administrateur |
| GET | `/api/clients/:id` | Vendeur, administrateur |
| POST | `/api/orders` | Client (commande web), vendeur / admin (vente en caisse) |
| GET | `/api/orders/me` | Client |
| GET | `/api/orders/:id` | Propriétaire ou personnel |
| GET `?status, mode` | `/api/orders` | Vendeur, administrateur |
| PUT | `/api/orders/:id/status` | Vendeur, administrateur |
| POST | `/api/employees/login`, `/logout` | Public |
| GET / POST / PUT / DELETE | `/api/employees[/:id]` | Administrateur |
| GET | `/api/dashboard/kpi` | Vendeur, administrateur |
| GET | `/api/promotions`, `/active`, `/:id` | Public |

Détail des paramètres et des réponses : `docs/openapi.yaml` ou `/api-docs`.

## Déploiement en production (Plesk du campus)

### Première mise en production de cette version (base déjà en service)

1. **Sauvegarder la base** de production (phpMyAdmin > Exporter, ou `mysqldump -u <user> -p <base> > sauvegarde.sql`).
2. **Appliquer la migration** : `mysql -u <user> -p <base> < database/migrations/001_exam_features.sql`
   (ajoute `client.created_at`, `produit.active`, rend les adresses de commande facultatives,
   passe les statuts / rôles en valeurs techniques anglaises).
3. **Hacher les mots de passe employés** restés en clair : `npm run hash-passwords`.

### Procédure de déploiement

1. Récupérer le code : `git pull` (ou clone de la branche principale).
2. Installer uniquement les dépendances de production : `npm ci --omit=dev`.
3. Variables d'environnement (panneau Node.js de Plesk ou fichier `.env`, jamais versionné) :
   `NODE_ENV=production`, `FRONTEND_URL=https://front-cafthe.slaurent.dev-campus.fr`,
   identifiants BDD d'un compte limité à `SELECT, INSERT, UPDATE, DELETE`, `JWT_SECRET` propre à la production.
4. Plesk : fichier de démarrage `server.js`, HTTPS activé (Let's Encrypt) sur le domaine de l'API.
   En production le cookie d'authentification est `Secure` : il n'est jamais envoyé en clair.
5. Redémarrer l'application Node.js dans Plesk.
6. Vérifier : `https://cafthe.slaurent.dev-campus.fr/health` doit répondre `{"status":"OK"}`.

> Le front et l'API doivent rester sur le même site (`*.slaurent.dev-campus.fr`) pour que le cookie
> `SameSite=Strict` soit envoyé par le navigateur.

Hors Plesk (VPS), le démarrage se fait avec un gestionnaire de processus :
`pm2 start server.js --name cafthe-api && pm2 save`.
