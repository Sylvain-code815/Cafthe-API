// Script one-shot pour hasher les mots de passe existants en clair (clients ET employés)
// Usage : node scripts/hashPasswords.js
// Sans danger si on le relance : les mots de passe déjà hachés sont ignorés

const db = require("../db");
const { hashPassword, isBcryptHash } = require("../utils/password");

// Hache les mots de passe en clair d'une table, renvoie le nombre de lignes modifiées
const hashTable = async (table, idColumn, passwordColumn) => {
    const [rows] = await db.query(`SELECT ${idColumn} AS id, ${passwordColumn} AS mdp FROM ${table}`);

    let updated = 0;
    for (const row of rows) {
        // NULL = compte client créé en boutique, pas encore activé
        if (row.mdp && !isBcryptHash(row.mdp)) {
            const hash = await hashPassword(row.mdp);
            await db.query(`UPDATE ${table} SET ${passwordColumn} = ? WHERE ${idColumn} = ?`, [hash, row.id]);
            console.log(`${table} ${row.id} : mot de passe hashé`);
            updated++;
        }
    }

    console.log(`${table} : ${updated} mot(s) de passe hashé(s) sur ${rows.length}`);
};

const hashExistingPasswords = async () => {
    try {
        // Noms de tables et colonnes écrits en dur (jamais issus d'une saisie utilisateur)
        await hashTable("client", "code_client", "mdp");
        await hashTable("employe", "num_employe", "mdp_employe");
        process.exit(0);
    } catch (error) {
        console.error("Erreur:", error.message);
        process.exit(1);
    }
};

hashExistingPasswords();
