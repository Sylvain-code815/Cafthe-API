const db = require("../config/db"); // Adapte le chemin vers ton fichier de connexion BDD

const OrderModel = {
  // Création de la commande complète
    orderTransaction: async (codeClient, orderData) => {
        const { total_ttc, adresse_rue, adresse_cp, adresse_ville, lignes } = orderData;

        const connection = await db.getConnection();

        try {
            await connection.beginTransaction(); // Début de la transaction

            // 1. Insertion de l'adresse
            const [adresseResult] = await connection.query(
                `INSERT INTO adresse (code_client, rue, cp, ville) VALUES (?, ?, ?, ?)`,
                [codeClient, adresse_rue, adresse_cp, adresse_ville]
            );
            const idAdresse = adresseResult.insertId;

            // 2. Insertion de la commande
            const [commandeResult] = await connection.query(
                `INSERT INTO commande (code_client, id_adresse_livraison, statut_commande, total_ttc) 
         VALUES (?, ?, 'En cours', ?)`,
                [codeClient, idAdresse, total_ttc]
            );
            const numCommande = commandeResult.insertId;

            // 3. Insertion des lignes de commande
            for (let item of lignes) {
                await connection.query(
                    `INSERT INTO ligne_commande (num_commande, code_produit, quantite, prix_unitaire) 
           VALUES (?, ?, ?, ?)`,
                    [numCommande, item.code_produit, item.quantite, item.prix_unitaire]
                );
            }

            await connection.commit();
            return numCommande;

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }
};

module.exports = OrderModel;