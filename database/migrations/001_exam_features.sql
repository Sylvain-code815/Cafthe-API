-- Migration 001 : base déjà en service
-- Fait évoluer le schéma existant sans perdre de données, pour :
-- - les comptes créés en caisse sans mot de passe
-- - la désactivation des produits au lieu de leur suppression
-- - le retrait en magasin et les ventes en caisse (commande sans adresse)
-- - le KPI "évolution du nombre de clients"
-- - les valeurs techniques en anglais attendues par l'API

-- Pas de retour arrière possible : MySQL valide chaque ALTER TABLE automatiquement

-- CLIENT : mot de passe facultatif + date d'inscription
ALTER TABLE client
  MODIFY mdp VARCHAR(64) NULL,
  ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- PRODUIT : désactivation logique + contraintes d'intégrité
ALTER TABLE produit
  ADD COLUMN active TINYINT(1) NOT NULL DEFAULT 1,
  ADD CONSTRAINT chk_produit_stock CHECK (stock >= 0),
  ADD CONSTRAINT chk_produit_prix CHECK (prix_HT >= 0 AND prix_ttc >= 0),
  ADD CONSTRAINT chk_produit_remise CHECK (taux_remise BETWEEN 0 AND 90);

-- COMMANDE : adresses facultatives (retrait en magasin, vente en caisse)
ALTER TABLE commande
  MODIFY id_adresse_livraison INT NULL,
  MODIFY id_adresse_facturation INT NULL,
  MODIFY statut_commande VARCHAR(20) NOT NULL DEFAULT 'pending';

ALTER TABLE ligne_commande
  ADD CONSTRAINT chk_lc_quantite CHECK (quantite > 0);

-- Valeurs techniques en anglais (le front affiche les libellés en français)
UPDATE commande SET statut_commande = CASE statut_commande
    WHEN 'En attente' THEN 'pending'
    WHEN 'Validée' THEN 'pending'
    WHEN 'En cours' THEN 'preparing'
    WHEN 'En préparation' THEN 'preparing'
    WHEN 'Expédiée' THEN 'shipped'
    WHEN 'Livrée' THEN 'delivered'
    ELSE statut_commande END;

UPDATE commande SET mode_commande = CASE mode_commande
    WHEN 'Web' THEN 'web'
    WHEN 'Tel' THEN 'store'
    WHEN 'Magasin' THEN 'store'
    ELSE mode_commande END;

UPDATE commande SET mode_paiement = CASE mode_paiement
    WHEN 'CB' THEN 'card'
    WHEN 'PayPal' THEN 'paypal'
    WHEN 'Espèces' THEN 'cash'
    WHEN 'Chèque' THEN 'check'
    WHEN 'Virement' THEN 'transfer'
    ELSE mode_paiement END;

UPDATE employe SET role = CASE role
    WHEN 'Admin' THEN 'ROLE_ADMIN'
    WHEN 'Vendeur' THEN 'ROLE_SELLER'
    ELSE role END;
