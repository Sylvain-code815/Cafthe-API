-- CafThé : utilisateur MySQL dédié à l'API (SELECT, INSERT, UPDATE, DELETE uniquement)

CREATE USER IF NOT EXISTS 'cafthe_api'@'localhost' IDENTIFIED BY 'ChangeMe_Str0ng!';

GRANT SELECT, INSERT, UPDATE, DELETE ON cafthe.* TO 'cafthe_api'@'localhost';

FLUSH PRIVILEGES;
