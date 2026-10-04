-- =====================================================================
-- CafThé - Création complète de la base de données (MySQL 8 / MariaDB 10.4+)
-- Schéma physique de production + jeu de données de test
--
-- Installation neuve :
--   mysql -u root -p < database/cafthe.sql
--   mysql -u root -p < database/create_user.sql
-- Base déjà en service : NE PAS utiliser ce fichier (il supprime la base),
-- appliquer database/migrations/001_exam_features.sql
-- =====================================================================

DROP DATABASE IF EXISTS cafthe;
CREATE DATABASE cafthe CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE cafthe;

-- ---------------------------------------------------------------------
-- EMPLOYE (role : 'ROLE_ADMIN' ou 'ROLE_SELLER')
-- ---------------------------------------------------------------------
CREATE TABLE employe (
  num_employe INT NOT NULL AUTO_INCREMENT,
  nom_employe VARCHAR(60) NOT NULL,
  prenom_employe VARCHAR(20) NOT NULL,
  mdp_employe VARCHAR(64) NOT NULL,
  email_employe VARCHAR(250) NOT NULL,
  tel_employe VARCHAR(15) NOT NULL,
  role VARCHAR(20) NOT NULL,
  PRIMARY KEY (num_employe),
  UNIQUE KEY email_employe (email_employe)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- CLIENT
-- mdp NULL : fiche créée en caisse par un vendeur (num_employe_createur),
--            le client l'active en ligne en choisissant son mot de passe
-- created_at : KPI "évolution du nombre de clients" (CDC 5.6)
-- ---------------------------------------------------------------------
CREATE TABLE client (
  code_client INT NOT NULL AUTO_INCREMENT,
  nom_client VARCHAR(60) NOT NULL,
  prenom_client VARCHAR(20) NOT NULL,
  mdp VARCHAR(64) NULL,
  email VARCHAR(250) NOT NULL,
  telephone VARCHAR(15) NOT NULL,
  num_employe_createur INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (code_client),
  UNIQUE KEY email (email),
  KEY num_employe_createur (num_employe_createur),
  CONSTRAINT client_ibfk_1 FOREIGN KEY (num_employe_createur) REFERENCES employe (num_employe) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- ADRESSE (carnet d'adresses : un client possède 0 à N adresses)
-- ---------------------------------------------------------------------
CREATE TABLE adresse (
  id_adresse INT NOT NULL AUTO_INCREMENT,
  code_client INT NOT NULL,
  titre VARCHAR(50) DEFAULT 'Domicile',
  rue VARCHAR(255) NOT NULL,
  cp VARCHAR(10) NOT NULL,
  ville VARCHAR(100) NOT NULL,
  pays VARCHAR(50) DEFAULT 'France',
  PRIMARY KEY (id_adresse),
  KEY code_client (code_client),
  CONSTRAINT adresse_ibfk_1 FOREIGN KEY (code_client) REFERENCES client (code_client) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- PRODUIT
-- Produit vendu au poids (type_vente autre que Sachet / Boite / Unité) :
-- prix_ttc et stock sont exprimés pour 100 g
-- active = 0 : produit retiré du catalogue, conservé pour l'historique (CDC 5.3.1)
-- ---------------------------------------------------------------------
CREATE TABLE produit (
  code_produit INT NOT NULL AUTO_INCREMENT,
  nom_produit VARCHAR(50) NOT NULL,
  description VARCHAR(255) NOT NULL,
  categorie VARCHAR(50) NOT NULL,
  type_vente VARCHAR(20) NOT NULL,
  tva DECIMAL(5,2) NOT NULL,
  prix_ttc DECIMAL(10,2) NOT NULL,
  prix_HT DECIMAL(10,2) NOT NULL,
  stock INT NOT NULL,
  image VARCHAR(150) NOT NULL,
  origine VARCHAR(100) NOT NULL,
  produit_phare TINYINT(1) NOT NULL DEFAULT 0,
  nouveaute TINYINT(1) NOT NULL DEFAULT 0,
  produit_promotion TINYINT(1) NOT NULL DEFAULT 0,
  taux_remise INT NOT NULL DEFAULT 0,
  active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (code_produit),
  CONSTRAINT chk_produit_stock CHECK (stock >= 0),
  CONSTRAINT chk_produit_prix CHECK (prix_HT >= 0 AND prix_ttc >= 0),
  CONSTRAINT chk_produit_remise CHECK (taux_remise BETWEEN 0 AND 90)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- PROMOTION
-- ---------------------------------------------------------------------
CREATE TABLE promotion (
  code_promo INT NOT NULL AUTO_INCREMENT,
  nom_promotion VARCHAR(100) NOT NULL,
  type_remise ENUM('pourcentage','montant') DEFAULT 'pourcentage',
  valeur_remise DECIMAL(5,2) NOT NULL,
  date_debut DATETIME NOT NULL,
  date_fin DATETIME NOT NULL,
  active TINYINT(1) DEFAULT 1,
  PRIMARY KEY (code_promo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- COMMANDE
-- statut_commande : 'pending' -> 'preparing' -> 'shipped' -> 'delivered'
-- mode_commande   : 'web' (site) ou 'store' (vente en caisse)
-- mode_paiement   : 'card', 'paypal', 'in_store' (payé au retrait), 'cash', 'check'
-- adresses NULL   : retrait en magasin ou vente en caisse
-- date_paiement NULL : paiement différé au retrait
-- total : lignes (remises comprises) + frais de livraison
-- ---------------------------------------------------------------------
CREATE TABLE commande (
  num_commande INT NOT NULL AUTO_INCREMENT,
  code_client INT NOT NULL,
  id_adresse_livraison INT NULL,
  id_adresse_facturation INT NULL,
  statut_commande VARCHAR(20) NOT NULL DEFAULT 'pending',
  mode_commande VARCHAR(20) NOT NULL,
  date_commande DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  mode_paiement VARCHAR(20) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  date_paiement DATETIME DEFAULT NULL,
  PRIMARY KEY (num_commande),
  KEY code_client (code_client),
  KEY id_adresse_livraison (id_adresse_livraison),
  KEY id_adresse_facturation (id_adresse_facturation),
  CONSTRAINT commande_ibfk_1 FOREIGN KEY (code_client) REFERENCES client (code_client),
  CONSTRAINT commande_ibfk_2 FOREIGN KEY (id_adresse_livraison) REFERENCES adresse (id_adresse),
  CONSTRAINT commande_ibfk_3 FOREIGN KEY (id_adresse_facturation) REFERENCES adresse (id_adresse)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- LIGNE_COMMANDE (prix figé au moment de l'achat)
-- quantite : unités, ou tranches de 100 g pour un produit vendu au poids
-- ---------------------------------------------------------------------
CREATE TABLE ligne_commande (
  num_commande INT NOT NULL,
  code_produit INT NOT NULL,
  quantite INT NOT NULL,
  prix_unitaire_achete DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (num_commande, code_produit),
  KEY code_produit (code_produit),
  CONSTRAINT ligne_commande_ibfk_1 FOREIGN KEY (num_commande) REFERENCES commande (num_commande) ON DELETE CASCADE,
  CONSTRAINT ligne_commande_ibfk_2 FOREIGN KEY (code_produit) REFERENCES produit (code_produit),
  CONSTRAINT chk_lc_quantite CHECK (quantite > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ---------------------------------------------------------------------
-- LIVRAISON (choix_transporteur : standard, express ou free)
-- ---------------------------------------------------------------------
CREATE TABLE livraison (
  num_bl INT NOT NULL AUTO_INCREMENT,
  num_commande INT NOT NULL,
  delai_livraison INT NOT NULL,
  date_livraison DATE NOT NULL,
  choix_transporteur VARCHAR(50) NOT NULL,
  PRIMARY KEY (num_bl),
  KEY num_commande (num_commande),
  CONSTRAINT livraison_ibfk_1 FOREIGN KEY (num_commande) REFERENCES commande (num_commande) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- =====================================================================
-- JEU DE DONNÉES DE TEST
-- Mot de passe de TOUS les comptes de test : CafThe#2026test
-- (empreinte bcrypt, coût 10 - ne jamais utiliser en production)
-- =====================================================================

INSERT INTO employe (num_employe, nom_employe, prenom_employe, mdp_employe, email_employe, tel_employe, role) VALUES
(1, 'Admin', 'Super', '$2b$10$RV4TjqKvG0g33FPPBy6G5OOZ5twwGDMgqclOk8yqsQVuHKWqhpBI.', 'admin@cafthe.com', '0102030405', 'ROLE_ADMIN'),
(2, 'Durand', 'Paul', '$2b$10$RV4TjqKvG0g33FPPBy6G5OOZ5twwGDMgqclOk8yqsQVuHKWqhpBI.', 'paul.durand@cafthe.com', '0611223344', 'ROLE_SELLER');

-- Sophie Lefebvre a été inscrite en boutique par Paul Durand : pas de mot de passe
INSERT INTO client (code_client, nom_client, prenom_client, mdp, email, telephone, num_employe_createur, created_at) VALUES
(1, 'Dupont', 'Marie', '$2b$10$RV4TjqKvG0g33FPPBy6G5OOZ5twwGDMgqclOk8yqsQVuHKWqhpBI.', 'marie.dupont@email.com', '0601020304', NULL, '2025-11-02 10:00:00'),
(2, 'Martin', 'Lucas', '$2b$10$RV4TjqKvG0g33FPPBy6G5OOZ5twwGDMgqclOk8yqsQVuHKWqhpBI.', 'lucas.martin@email.com', '0699887766', NULL, '2026-01-15 14:30:00'),
(3, 'Lefebvre', 'Sophie', NULL, 'sophie.lefebvre@email.com', '0755443322', 2, '2026-01-27 09:15:00');

INSERT INTO adresse (id_adresse, code_client, titre, rue, cp, ville, pays) VALUES
(1, 1, 'Domicile', '10 Rue de la Paix', '75001', 'Paris', 'France'),
(2, 2, 'Domicile', '5 Avenue des Tilleuls', '69002', 'Lyon', 'France'),
(3, 2, 'Bureau', 'Bureau 42, Tour Part-Dieu', '69003', 'Lyon', 'France'),
(4, 3, 'Domicile', '12 Boulevard de la Mer', '13008', 'Marseille', 'France');

-- Produits vendus au poids (Vrac, Grain, Dosette...) : prix_ttc et stock pour 100 g
INSERT INTO produit (code_produit, nom_produit, description, categorie, type_vente, tva, prix_ttc, prix_HT, stock, image, origine, produit_phare, nouveaute, produit_promotion, taux_remise) VALUES
(1, 'Café Arabica Bio', 'Un café doux et fruité, 100% Arabica.', 'Café', 'Boite', 5.50, 15.90, 15.07, 100, 'produit-cafe-boite.webp', 'Éthiopie', 1, 0, 0, 0),
(2, 'Robusta Intense', 'Un café corsé pour un réveil tonique.', 'Café', 'Boite', 5.50, 12.50, 11.85, 50, 'produit-cafe-onsale-boite.webp', 'Vietnam', 0, 0, 1, 50),
(3, 'Thé Vert Sencha', 'Thé vert japonais traditionnel aux notes végétales.', 'Thé', 'Boite', 5.50, 18.00, 17.06, 80, 'produit-the-boite.webp', 'Japon', 1, 0, 0, 0),
(4, 'Earl Grey Royal', 'Thé noir aromatisé à la bergamote.', 'Thé', 'Sachet', 5.50, 14.00, 13.27, 120, 'produit-the-sachets.webp', 'Inde', 0, 0, 0, 0),
(5, 'Mug CafThé', 'Mug en céramique avec logo CafThé.', 'Accessoire', 'Unité', 20.00, 9.90, 8.25, 200, 'produit-accessoire-onsale.webp', 'France', 0, 1, 1, 20),
(6, 'Thé Noir Darjeeling', 'Le champagne des thés noirs, aux notes muscatées.', 'Thé', 'Vrac', 5.50, 18.50, 17.54, 50, 'produit-the-pochette.webp', 'Inde', 1, 0, 0, 0),
(7, 'Thé Blanc Pai Mu Tan', 'Thé blanc délicat aux bourgeons duveteux.', 'Thé', 'Boite', 5.50, 22.00, 20.85, 30, 'produit-the-onsale-boite.webp', 'Chine', 0, 0, 1, 20),
(8, 'Rooibos Vanille', 'Infusion sans théine, douce et parfumée à la vanille.', 'Thé', 'Vrac', 5.50, 14.00, 13.27, 80, 'produit-the-pochette.webp', 'Afrique du Sud', 0, 0, 0, 0),
(9, 'Infusion Nuit Calme', 'Mélange de mélisse, verveine et tilleul.', 'Thé', 'Boite', 5.50, 12.50, 11.85, 60, 'produit-the-boite.webp', 'France', 0, 0, 0, 0),
(10, 'Oolong Milky', 'Un thé Oolong aux notes naturelles de lait et de beurre.', 'Thé', 'Vrac', 5.50, 24.90, 23.60, 25, 'produit-the-pochette.webp', 'Taïwan', 1, 0, 0, 0),
(11, 'Thé Vert Jasmin', 'Thé vert traditionnel parfumé aux fleurs de jasmin.', 'Thé', 'Sachet', 5.50, 13.90, 13.18, 100, 'produit-the-sachets-onsale.webp', 'Chine', 0, 0, 1, 20),
(12, 'Thé Noir Ceylan', 'Un grand classique corsé, idéal pour le matin.', 'Thé', 'Vrac', 5.50, 11.00, 10.43, 150, 'produit-the-pochette.webp', 'Sri Lanka', 0, 0, 0, 0),
(13, 'Matcha Cérémonie', 'Poudre de thé vert impérial pour la cérémonie traditionnelle.', 'Thé', 'Boite', 5.50, 35.00, 33.18, 15, 'produit-the-boite.webp', 'Japon', 1, 1, 0, 0),
(14, 'Infusion Fruits Rouges', 'Explosion de saveurs : fraise, framboise, mûre.', 'Thé', 'Vrac', 5.50, 10.50, 9.95, 90, 'produit-the-onsale-pochette.webp', 'Allemagne', 0, 0, 1, 20),
(15, 'Lapsang Souchong', 'Thé noir fumé au bois de pin, goût unique.', 'Thé', 'Vrac', 5.50, 16.00, 15.17, 40, 'produit-the-pochette.webp', 'Chine', 0, 0, 0, 0),
(16, 'Moka Éthiopie', 'Café sauvage aux notes florales et d''agrumes.', 'Café', 'Grain', 5.50, 19.90, 18.86, 60, 'produit-cafe-grain.webp', 'Éthiopie', 1, 0, 0, 0),
(17, 'Colombie Supremo', 'Équilibré et doux, avec une belle acidité.', 'Café', 'Dosette', 5.50, 15.50, 14.69, 80, 'produit-cafe-dosette.webp', 'Colombie', 0, 0, 0, 0),
(18, 'Brésil Santos', 'Café rond aux notes de chocolat et de noisette.', 'Café', 'Grain', 5.50, 13.00, 12.32, 120, 'produit-cafe-onsale-grain.webp', 'Brésil', 0, 0, 1, 20),
(19, 'Décaféiné Eau', 'Décaféination naturelle à l''eau, sans solvant.', 'Café', 'Dosette', 5.50, 16.50, 15.64, 50, 'produit-cafe-dosette.webp', 'Mexique', 0, 0, 0, 0),
(20, 'Blend Maison', 'Notre assemblage signature pour un espresso parfait.', 'Café', 'Grain', 5.50, 14.90, 14.12, 200, 'produit-cafe-grain.webp', 'Assemblage', 1, 0, 0, 0),
(21, 'Costa Rica Tarrazu', 'Café vif et complet, cultivé en haute altitude.', 'Café', 'Boite', 5.50, 17.90, 16.97, 45, 'produit-cafe-boite.webp', 'Costa Rica', 0, 0, 0, 0),
(22, 'Guatemala Antigua', 'Notes épicées et corps puissant.', 'Café', 'Grain', 5.50, 18.20, 17.25, 40, 'produit-cafe-grain.webp', 'Guatemala', 0, 1, 0, 0),
(23, 'Sumatra Mandheling', 'Café racé, terreux et peu acide.', 'Café', 'Dosette', 5.50, 21.00, 19.91, 30, 'produit-cafe-onsale-dosette.webp', 'Indonésie', 0, 0, 1, 20),
(24, 'Théière Fonte 0.8L', 'Théière traditionnelle japonaise noire.', 'Accessoire', 'Unité', 20.00, 45.00, 37.50, 10, 'produit-accessoire.webp', 'Japon', 1, 0, 0, 0),
(25, 'Boule à Thé Inox', 'Infuseur classique avec chaînette.', 'Accessoire', 'Unité', 20.00, 4.50, 3.75, 200, 'produit-accessoire.webp', 'Chine', 0, 0, 0, 0),
(26, 'Filtres Papier x100', 'Filtres biodégradables pour thé en vrac.', 'Accessoire', 'Boite', 20.00, 6.90, 5.75, 150, 'produit-accessoire.webp', 'Allemagne', 0, 0, 0, 0),
(27, 'Coffret Découverte', 'Assortiment de 6 thés et cafés.', 'Accessoire', 'Boite', 20.00, 29.90, 24.92, 25, 'produit-accessoire-onsale.webp', 'Monde', 1, 0, 1, 20),
(28, 'Cuillère Doseuse', 'Cuillère en acier doré pour doser le thé.', 'Accessoire', 'Unité', 20.00, 8.00, 6.67, 100, 'produit-accessoire.webp', 'Chine', 0, 0, 0, 0),
(29, 'Mousseur à Lait', 'Pour réaliser des cappuccinos onctueux.', 'Accessoire', 'Unité', 20.00, 12.90, 10.75, 40, 'produit-accessoire-onsale.webp', 'Chine', 0, 1, 1, 20),
(30, 'Tasse Double Paroi', 'Verre borosilicate pour garder la chaleur.', 'Accessoire', 'Unité', 20.00, 11.50, 9.58, 60, 'produit-accessoire.webp', 'Chine', 0, 0, 0, 0);

-- Commande 1 : web, livrée (standard 4,99 EUR) / Commande 2 : web, en préparation, facturée au bureau (express 9,99 EUR)
-- Commande 3 : vente en caisse pour la cliente inscrite en boutique
INSERT INTO commande (num_commande, code_client, id_adresse_livraison, id_adresse_facturation, statut_commande, mode_commande, date_commande, mode_paiement, total, date_paiement) VALUES
(1, 1, 1, 1, 'delivered', 'web', '2025-12-10 14:00:00', 'card', 44.71, '2025-12-10 14:05:00'),
(2, 2, 2, 3, 'preparing', 'web', '2026-01-26 10:30:00', 'paypal', 27.99, '2026-01-26 10:35:00'),
(3, 3, NULL, NULL, 'delivered', 'store', '2026-01-27 16:45:00', 'cash', 110.75, '2026-01-27 16:45:00');

INSERT INTO ligne_commande (num_commande, code_produit, quantite, prix_unitaire_achete) VALUES
(1, 1, 2, 15.90),
(1, 5, 1, 7.92),
(2, 3, 1, 18.00),
(3, 1, 5, 15.90),
(3, 2, 5, 6.25);

INSERT INTO livraison (num_bl, num_commande, delai_livraison, date_livraison, choix_transporteur) VALUES
(1, 1, 5, '2025-12-15', 'standard'),
(2, 2, 2, '2026-01-28', 'express');
