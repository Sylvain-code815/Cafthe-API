// Contrôleur Client : inscription, connexion, espace personnel
const {
    createClient,
    findClientByEmail,
    findClientById,
    findClientPasswordHash,
    updateClient,
    updatePassword,
    searchClients,
    getClientStats,
} = require("../models/ClientModel");
const { getAdressesByClient } = require("../../adresse/models/AdresseModel");
const { getOrdersByClient } = require("../../order/models/OrderModel");
const {
    RESET_TOKEN_MINUTES,
    createResetToken,
    findValidToken,
    markTokenUsed,
} = require("../../password-reset/models/PasswordResetModel");
const { sendMail } = require("../../utils/mailer");
const { ROLES } = require("../../config/constants");
const { CLIENT_SESSION_SECONDS, sendAuthCookie, clearAuthCookie } = require("../../utils/authToken");
const { PASSWORD_RULE, hashPassword, verifyPassword } = require("../../utils/password");
const {
    parseId,
    isNonEmptyString,
    isValidEmail,
    normalizeEmail,
    normalizePhone,
    isStrongPassword,
    isValidPhone,
    validationError,
} = require("../../utils/validators");

// Format renvoyé au front
const toPublicClient = (client) => ({
    id: client.code_client,
    nom: client.nom_client,
    prenom: client.prenom_client,
    email: client.email,
    telephone: client.telephone,
});

// Valide nom, prénom et téléphone (longueurs du schéma physique)
// phoneRequired : obligatoire pour une fiche créée en caisse, facultatif en ligne
const validateIdentity = ({ nom, prenom, telephone }, phoneRequired) => {
    const errors = [];
    if (!isNonEmptyString(nom, 60)) errors.push("Le nom est obligatoire (60 caractères max)");
    if (!isNonEmptyString(prenom, 20)) errors.push("Le prénom est obligatoire (20 caractères max)");
    const phoneGiven = telephone !== undefined && telephone !== "";
    if ((phoneRequired || phoneGiven) && !isValidPhone(telephone)) {
        errors.push("Le téléphone doit contenir 10 chiffres et commencer par 0");
    }
    return errors;
};

// Connecte le client : token JWT dans un cookie HttpOnly
const openClientSession = (res, clientId) => {
    sendAuthCookie(res, { id: clientId, role: ROLES.CLIENT }, CLIENT_SESSION_SECONDS);
};

const register = async (req, res) => {
    const { nom, prenom, mdp, telephone } = req.body || {};
    const email = normalizeEmail(req.body?.email);

    const errors = validateIdentity({ nom, prenom, telephone }, false);
    if (!isValidEmail(email)) errors.push("L'email est invalide");
    if (!isStrongPassword(mdp)) errors.push(PASSWORD_RULE);
    if (errors.length > 0) {
        return validationError(res, errors);
    }

    try {
        const existingClient = await findClientByEmail(email);
        if (existingClient.length > 0) {
            // Compte créé en boutique : il doit être activé, pas recréé
            const activationRequired = existingClient[0].mdp === null;
            const message = activationRequired
                ? "Un compte a été créé pour cet email en boutique : activez-le avec votre numéro de téléphone"
                : "Cet email est déjà utilisé";
            return res.status(409).json({ message, activation_required: activationRequired });
        }

        const hash = await hashPassword(mdp);

        const result = await createClient({
            nom: nom.trim(),
            prenom: prenom.trim(),
            email,
            mdp: hash,
            telephone,
        });

        res.status(201).json({
            message: "Inscription réussie",
            client_id: result.insertId,
            client: { nom: nom.trim(), prenom: prenom.trim(), email },
        });
    } catch (error) {
        // Deux inscriptions simultanées : la contrainte UNIQUE de la BDD tranche
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "Cet email est déjà utilisé" });
        }
        console.error("Erreur inscription", error.message);
        res.status(500).json({
            message: "Erreur lors de l'inscription",
        });
    }
};

// Activation d'un compte créé en boutique : le client prouve son identité (email + téléphone) puis choisit son mot de passe
const activate = async (req, res) => {
    const { mdp } = req.body || {};
    const telephone = normalizePhone(req.body?.telephone);
    const email = normalizeEmail(req.body?.email);

    if (!isValidEmail(email) || !isValidPhone(telephone)) {
        return res.status(400).json({ message: "Email ou téléphone invalide" });
    }
    if (!isStrongPassword(mdp)) {
        return res.status(400).json({ message: PASSWORD_RULE });
    }

    try {
        const clients = await findClientByEmail(email);
        const client = clients[0];

        // Même message dans tous les cas d'échec : on ne révèle pas si l'email existe
        // Les fiches créées en boutique ont pu être saisies avec des espaces (06 01 02 03 04)
        if (!client || client.mdp !== null || normalizePhone(client.telephone) !== telephone) {
            return res.status(400).json({ message: "Impossible d'activer ce compte, vérifiez vos informations" });
        }

        await updatePassword(client.code_client, await hashPassword(mdp));

        openClientSession(res, client.code_client);
        res.json({
            message: "Compte activé avec succès",
            client: toPublicClient(client),
        });
    } catch (error) {
        console.error("Erreur activation compte", error.message);
        res.status(500).json({ message: "Erreur lors de l'activation du compte" });
    }
};

const login = async (req, res) => {
    const { mdp } = req.body || {};
    const email = normalizeEmail(req.body?.email);

    if (!isValidEmail(email) || typeof mdp !== "string" || mdp.length === 0) {
        return res.status(400).json({ message: "Email et mot de passe requis" });
    }

    try {
        const clients = await findClientByEmail(email);
        const client = clients[0];

        // Compte inexistant ou créé en boutique sans mot de passe -> false, après le même temps de calcul
        const isMatch = await verifyPassword(mdp, client?.mdp);

        // Message identique si l'email est inconnu ou si le mot de passe est faux
        if (!isMatch) {
            return res.status(401).json({
                message: "Identifiants incorrects",
            });
        }

        openClientSession(res, client.code_client);

        res.json({
            message: "Connexion réussie",
            client: toPublicClient(client),
        })

    } catch (error) {
        console.error("Erreur de connexion utilisateur", error.message);
        res.status(500).json({
            message: "Erreur lors de la connexion",
        })
    }
};


// Infos du client connecté (identifié par le cookie via verifyToken)
const getMe = async (req, res) => {
    try {
        // req.user.id vient du JWT décodé par le middleware verifyToken
        const clients = await findClientById(req.user.id);

        if (clients.length === 0) {
            return res.status(404).json({ message: "Client introuvable" });
        }

        res.json({ client: toPublicClient(clients[0]) });
    } catch (error) {
        console.error("Erreur /me:", error.message);
        res.status(500).json({ message: "Erreur lors de la vérification de session" });
    }
};

const logout = (req, res) => {
    clearAuthCookie(res);
    res.json({ message: "Déconnexion réussie" });
};

// Les champs absents gardent leur valeur actuelle
const updateProfile = async (req, res) => {
    try {
        const clients = await findClientById(req.user.id);
        if (clients.length === 0) {
            return res.status(404).json({ message: "Client introuvable" });
        }
        const current = clients[0];

        const body = req.body || {};
        const data = {
            nom: body.nom ?? current.nom_client,
            prenom: body.prenom ?? current.prenom_client,
            email: body.email !== undefined ? normalizeEmail(body.email) : current.email,
            telephone: body.telephone ?? current.telephone,
        };

        const errors = validateIdentity(data, false);
        if (!isValidEmail(data.email)) errors.push("L'email est invalide");
        if (errors.length > 0) {
            return validationError(res, errors);
        }

        if (data.email !== current.email) {
            const existing = await findClientByEmail(data.email);
            if (existing.length > 0) {
                return res.status(409).json({ message: "Cet email est déjà utilisé" });
            }
        }

        await updateClient(req.user.id, { ...data, nom: data.nom.trim(), prenom: data.prenom.trim() });

        res.json({ message: "Profil mis à jour avec succès" });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "Cet email est déjà utilisé" });
        }
        console.error("Erreur mise à jour profil:", error.message);
        res.status(500).json({ message: "Erreur lors de la mise à jour du profil" });
    }
};

// Changement de mot de passe : l'ancien est exigé
const changePassword = async (req, res) => {
    const { ancienMdp, nouveauMdp } = req.body || {};

    if (typeof ancienMdp !== "string" || !ancienMdp || !nouveauMdp) {
        return res.status(400).json({ message: "Ancien et nouveau mot de passe requis" });
    }
    if (!isStrongPassword(nouveauMdp)) {
        return res.status(400).json({ message: PASSWORD_RULE });
    }

    try {
        const currentHash = await findClientPasswordHash(req.user.id);
        if (!(await verifyPassword(ancienMdp, currentHash))) {
            return res.status(401).json({ message: "Ancien mot de passe incorrect" });
        }

        await updatePassword(req.user.id, await hashPassword(nouveauMdp));

        res.json({ message: "Mot de passe modifié avec succès" });
    } catch (error) {
        console.error("Erreur changement mot de passe:", error.message);
        res.status(500).json({ message: "Erreur lors du changement de mot de passe" });
    }
};

// GET /api/clients?search=dupont - Recherche d'un client en caisse (personnel)
const search = async (req, res) => {
    const term = req.query.search;
    if (!isNonEmptyString(term, 100)) {
        return res.status(400).json({ message: "Paramètre search obligatoire (100 caractères max)" });
    }

    try {
        const clients = await searchClients(term.trim());
        res.json({ message: "Clients récupérés avec succès", count: clients.length, clients });
    } catch (error) {
        console.error("Erreur recherche clients:", error.message);
        res.status(500).json({ message: "Erreur lors de la recherche de clients" });
    }
};

// POST /api/clients - Création d'une fiche client en caisse (personnel)
// Pas de mot de passe : le client activera son compte en ligne plus tard
const createInStore = async (req, res) => {
    const { nom, prenom, telephone } = req.body || {};
    const email = normalizeEmail(req.body?.email);

    const errors = validateIdentity({ nom, prenom, telephone }, true);
    if (!isValidEmail(email)) errors.push("L'email est invalide");
    if (errors.length > 0) {
        return validationError(res, errors);
    }

    try {
        const result = await createClient({
            nom: nom.trim(),
            prenom: prenom.trim(),
            email,
            telephone,
            // Traçabilité : le vendeur connecté est enregistré comme créateur de la fiche
            num_employe_createur: req.user.id,
        });

        const [client] = await findClientById(result.insertId);
        res.status(201).json({ message: "Fiche client créée avec succès", client });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "Un client existe déjà avec cet email" });
        }
        console.error("Erreur création fiche client:", error.message);
        res.status(500).json({ message: "Erreur lors de la création de la fiche client" });
    }
};

// GET /api/clients/:id - Fiche complète d'un client (personnel) :
// profil, adresses, historique unifié magasin + web et statistiques
const getClientDetails = async (req, res) => {
    const clientId = parseId(req.params.id);
    if (!clientId) {
        return res.status(400).json({ message: "Identifiant de client invalide" });
    }

    try {
        const clients = await findClientById(clientId);
        if (clients.length === 0) {
            return res.status(404).json({ message: "Client introuvable" });
        }

        const [adresses, commandes, statistiques] = await Promise.all([
            getAdressesByClient(clientId),
            getOrdersByClient(clientId),
            getClientStats(clientId),
        ]);

        res.json({
            message: "Fiche client récupérée avec succès",
            client: { ...clients[0], adresses, commandes, statistiques },
        });
    } catch (error) {
        console.error("Erreur fiche client:", error.message);
        res.status(500).json({ message: "Erreur lors de la récupération de la fiche client" });
    }
};

// Message identique que le compte existe ou non : on ne révèle pas quels emails sont inscrits
const FORGOT_PASSWORD_MESSAGE = "Si un compte est associé à cet email, vous recevrez un mail pour changer votre mot de passe";

// Page du front qui reçoit le jeton (/#/reset-password)
// Sans guillemets dans le .env, dotenv coupe la valeur au « # » : on rajoute alors la route
const resetPageUrl = () => {
    const front = (process.env.FRONTEND_URL || "http://localhost:5173").split(",")[0].trim();
    const url = (process.env.RESET_PASSWORD_URL || front).trim();
    return url.includes("#/") ? url : `${url.replace(/\/+$/, "")}/#/reset-password`;
};

// Mot de passe oublié : envoie par email un lien temporaire (1 heure, usage unique)
// Fonctionne aussi pour une fiche créée en boutique sans mot de passe
const forgotPassword = async (req, res) => {
    const email = normalizeEmail(req.body?.email);
    if (!isValidEmail(email)) {
        return res.status(400).json({ message: "L'email est invalide" });
    }

    try {
        const clients = await findClientByEmail(email);
        const client = clients[0];

        if (client) {
            const token = await createResetToken("client", client.code_client);
            await sendMail({
                to: client.email,
                subject: "CafThé - Réinitialisation de votre mot de passe",
                text: `Bonjour ${client.prenom_client},\n\n`
                    + "Vous avez demandé à changer votre mot de passe. Cliquez sur ce lien pour en choisir un nouveau :\n"
                    + `${resetPageUrl()}?token=${token}\n\n`
                    + `Ce lien est valable ${RESET_TOKEN_MINUTES} minutes et ne peut servir qu'une fois.\n`
                    + "Si vous n'êtes pas à l'origine de cette demande, ignorez cet email : votre mot de passe ne change pas.\n\n"
                    + "L'équipe CafThé",
            });
        }

        res.json({ message: FORGOT_PASSWORD_MESSAGE });
    } catch (error) {
        console.error("Erreur mot de passe oublié", error.message);
        res.status(500).json({ message: "Erreur lors de l'envoi de l'email, réessayez plus tard" });
    }
};

// Réinitialisation : vérifie le jeton reçu par email puis enregistre le nouveau mot de passe
const resetPassword = async (req, res) => {
    const { token, mdp } = req.body || {};

    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
        return res.status(400).json({ message: "Lien invalide ou expiré" });
    }
    if (!isStrongPassword(mdp)) {
        return res.status(400).json({ message: PASSWORD_RULE });
    }

    try {
        const reset = await findValidToken("client", token);
        if (!reset) {
            return res.status(400).json({ message: "Lien invalide ou expiré" });
        }

        await updatePassword(reset.account_id, await hashPassword(mdp));
        await markTokenUsed(reset.id);

        res.json({ message: "Votre mot de passe a été modifié, vous pouvez vous connecter" });
    } catch (error) {
        console.error("Erreur réinitialisation mot de passe", error.message);
        res.status(500).json({ message: "Erreur lors de la réinitialisation du mot de passe" });
    }
};

module.exports = {
    register,
    activate,
    login,
    logout,
    getMe,
    updateProfile,
    changePassword,
    forgotPassword,
    resetPassword,
    search,
    createInStore,
    getClientDetails,
};
