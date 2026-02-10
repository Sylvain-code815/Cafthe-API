// CORRECTION 1 : On utilise require, pas import !
const { comparePassword, createClient, findClientByEmail, hashPassword, findClientById } = require("../models/ClientModel");
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
        // Expire en secondes
        const expire = parseInt(process.env.JWT_EXPIRES_IN, 10) || 3600
        const token = jwt.sign({
                id: client.code_client, // D'après ton SQL initial : code_client
                email: client.email,    // D'après ton SQL initial : email
            },
            // CORRECTION 3 : Dans ton .env tu as mis JWT_SECRET, pas JWT_SECRET_KEY
            process.env.JWT_SECRET,
            {expiresIn: expire},
        );

        // On place le token dans un cookie HTTPOnly
        res.cookie("token", token, {
            httpOnly: true,
            secure: false, // Mettre sur true en HTTPS, en local elle ne marche pas
            sameSite: "lax",
            maxAge: expire * 1000,
        });

        res.json({
            message: "Connexion réussie",
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
};


// Permet au front de rafraîchir les données du back
// Automatiquement, le navigateur envoie le cookie
// Le middleware vérifie le JWT
// Si le token est valide, on retourne les infos du client

const getMe = async (req, res) => {
    try {
        // req.client.id vient du JWT decode par le middleware verifyToken
        const clients = await findClientById(req.client.id);

        if (clients.length === 0) {
            return res.status(404).json({ message: "Client introuvable" });
        }

        const client = clients[0];

        res.json({
            client: {
                id: client.code_client,
                nom: client.nom_client,
                prenom: client.prenom_client,
                email: client.email
            }
        });
    } catch (error) {
        console.error("Erreur /me:", error.message);
        res.status(500).json({ message: "Erreur lors de la vérification de session" });
    }
};

// Fonction de déconnexion
const logout = (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: false, // Pareil ici, mettre en true
        sameSite: "lax"
    });
    res.json({ message: "Déconnexion réussie" });
};

module.exports = { register, login, logout, getMe };