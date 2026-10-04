// Configuration commune à tous les tests (chargée par Jest avant chaque fichier)
// Clé de test : les tokens signés pendant les tests ne sont valables que dans les tests
process.env.JWT_SECRET = "test_secret_only_for_automated_tests";
process.env.NODE_ENV = "test";
