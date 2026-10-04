// Outils partagés par les tests
const { signToken } = require("../utils/authToken");

// En-tête Authorization avec un token valide pour le rôle demandé
const authHeader = (role, id = 1) => ({
    Authorization: `Bearer ${signToken({ id, role }, 60)}`,
});

module.exports = { authHeader };
