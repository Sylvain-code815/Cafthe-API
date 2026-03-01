// Script one-shot pour hasher les mots de passe existants en clair
// Usage : node scripts/hashPasswords.js

const db = require("../db");
const bcrypt = require("bcryptjs");

const hashExistingPasswords = async () => {
    try {
        // Récupérer tous les clients
        const [clients] = await db.query("SELECT code_client, mdp FROM client");

        let updated = 0;

        for (const client of clients) {
            // Vérifier si le mdp est déjà hashé (bcrypt commence par $2b$)
            if (client.mdp && !client.mdp.startsWith("$2b$")) {
                const hash = await bcrypt.hash(client.mdp, 10);
                await db.query("UPDATE client SET mdp = ? WHERE code_client = ?", [hash, client.code_client]);
                console.log(`Client ${client.code_client} : mot de passe hashé`);
                updated++;
            }
        }

        console.log(`\nTerminé : ${updated} mot(s) de passe hashé(s) sur ${clients.length} client(s)`);
        process.exit(0);
    } catch (error) {
        console.error("Erreur:", error.message);
        process.exit(1);
    }
};

hashExistingPasswords();
