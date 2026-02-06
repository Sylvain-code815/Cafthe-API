// CORRECTION 1 : On utilise require, pas import !
const { comparePassword, createClient, findClientByEmail, hashPassword } = require("../models/ClientModel");
const jwt = require("jsonwebtoken");

// Inscription
const register = async (req, res) => {
    try {
        const { nom, prenom, email, mdp } = req.body;

        // Vérifier si l'email existe déjà
        const existingClient = await findClientByEmail(email);

        // CORRECTION : existingClient est un tableau, on vérifie sa longueur
        if (existingClient.length > 0) {
            return res.status(400).json({ // .json est mieux que .send
                message: "Cet email est déjà utilisé"
            })
        }

        // Hacher le mot de passe
        const hash = await hashPassword(mdp);

        // Créer le client
        const result = await createClient({
            nom, prenom, email,
            mdp: hash,
        });

        res.status(201).json({
            message: "Inscription réussie",
            // insertId est la propriété standard de mysql2 pour l'ID créé
            client_id: result.insertId,
            client: {nom, prenom, email},
        });

    } catch (error) {
        console.error("Erreur inscription", error.message);
        res.status(500).json({
            message: "Erreur lors de l'inscription",
        });
    }
}

// Connexion
const login = async (req, res) => {
    try {
        const { email, mdp } = req.body;

        const clients = await findClientByEmail(email);

        if (clients.length === 0){
            return res.status(401).json({
                message: "Identifiants incorrects"
            })
        }

        const client = clients[0];

        // Vérifier le mot de passe
        const isMatch = await comparePassword(mdp, client.mdp);

        if (!isMatch) {
            return res.status(401).json({
                message: "Identifiants incorrects",
            });
        }

        // Générer le token JWT
        const token = jwt.sign({
                id: client.code_client, // D'après ton SQL initial : code_client
                email: client.email,    // D'après ton SQL initial : email
            },
            // CORRECTION 3 : Dans ton .env tu as mis JWT_SECRET, pas JWT_SECRET_KEY
            process.env.JWT_SECRET,
            {expiresIn: process.env.JWT_EXPIRES_IN || "1h"},
        );

        res.json({
            message: "Connexion réussie",
            token,
            client: {
                id: client.code_client,
                nom: client.nom_client,
                prenom: client.prenom_client,
                email: client.email,
            }
        })

    } catch (error) {
        console.error("Erreur de connexion utilisateur", error.message);
        res.status(500).json({
            message: "Erreur lors de la connexion",
        })
    }
}

module.exports = { register, login };