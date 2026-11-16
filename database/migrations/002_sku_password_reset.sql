-- Migration 002 : référence SKU des produits + mot de passe oublié
-- - produit.sku : référence unique obligatoire
--   Format : CAF-0001 / THE-0003 / ACC-0005 (préfixe de catégorie + numéro)
-- - password_reset : jetons de réinitialisation de mot de passe

-- PRODUIT : colonne d'abord facultative pour remplir les produits existants
ALTER TABLE produit ADD COLUMN sku VARCHAR(20) NULL AFTER code_produit;

UPDATE produit SET sku = CONCAT(
    CASE
        WHEN categorie LIKE 'Caf%' THEN 'CAF'
        WHEN categorie LIKE 'Th%' THEN 'THE'
        ELSE 'ACC'
    END,
    '-', LPAD(code_produit, 4, '0'));

-- Une fois remplie, la référence devient obligatoire et unique
ALTER TABLE produit
  MODIFY sku VARCHAR(20) NOT NULL,
  ADD UNIQUE KEY uq_produit_sku (sku);

-- PASSWORD_RESET : un jeton par demande, valable 1 heure, utilisable une seule fois.
-- Seule l'empreinte SHA-256 du jeton est enregistrée
-- account_type vaut 'client' ou 'employee' : pas de clé étrangère, account_id pointe vers client ou employe
CREATE TABLE password_reset (
  id INT NOT NULL AUTO_INCREMENT,
  account_type VARCHAR(10) NOT NULL,
  account_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_password_reset_token (token_hash),
  KEY idx_password_reset_account (account_type, account_id),
  CONSTRAINT chk_password_reset_type CHECK (account_type IN ('client', 'employee'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
