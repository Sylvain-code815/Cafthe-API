-- =====================================================================
-- CafThé - Utilisateur MySQL dédié à l'API (principe du moindre privilège)
--
-- L'API ne se connecte jamais en "root" : ce compte ne peut que lire et
-- écrire des données (SELECT, INSERT, UPDATE, DELETE). Il ne peut ni
-- supprimer une table, ni modifier le schéma, ni créer d'autres comptes.
--
-- Remplacer 'ChangeMe_Str0ng!' par un vrai mot de passe avant exécution,
-- puis reporter ce mot de passe dans DB_PASSWORD du fichier .env.
-- =====================================================================

CREATE USER IF NOT EXISTS 'cafthe_api'@'localhost' IDENTIFIED BY 'ChangeMe_Str0ng!';

GRANT SELECT, INSERT, UPDATE, DELETE ON cafthe.* TO 'cafthe_api'@'localhost';

FLUSH PRIVILEGES;
