// Contrôleur Employés : connexion du personnel et gestion des comptes vendeurs
// (CDC 5.2 : seul l'administrateur peut créer, modifier ou supprimer un compte vendeur)
const {
    findEmployeeByEmail,
    findEmployeeById,
    getAllEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
} = require("../models/EmployeeModel");
const { STAFF_ROLES } = require("../../config/constants");
const { STAFF_SESSION_SECONDS, sendAuthCookie, clearAuthCookie } = require("../../utils/authToken");
const { PASSWORD_RULE, hashPassword, verifyPassword } = require("../../utils/password");
const {
    normalizeEmail,
    parseId,
    isNonEmptyString,
    isValidEmail,
    isStrongPassword,
    isValidPhone,
    validationError,
} = require("../../utils/validators");

// Valide un compte employé. passwordRequired = false lors d'une modification
// Renvoie { errors } ou { employee }
const buildEmployee = (input, passwordRequired) => {
    const email = normalizeEmail(input.email_employe);
    const errors = [];

    if (!isNonEmptyString(input.nom_employe, 60)) errors.push("nom_employe obligatoire (60 caractères max)");
    if (!isNonEmptyString(input.prenom_employe, 20)) errors.push("prenom_employe obligatoire (20 caractères max)");
    if (!isValidEmail(email)) errors.push("email_employe invalide");
    if (!isValidPhone(input.tel_employe)) errors.push("tel_employe invalide (10 chiffres commençant par 0)");
    if (!STAFF_ROLES.includes(input.role)) errors.push(`role invalide (${STAFF_ROLES.join(", ")})`);
    if ((passwordRequired || input.mdp_employe !== undefined) && !isStrongPassword(input.mdp_employe)) {
        errors.push(PASSWORD_RULE);
    }
    if (errors.length > 0) return { errors };

    return {
        employee: {
            nom_employe: input.nom_employe.trim(),
            prenom_employe: input.prenom_employe.trim(),
            email_employe: email,
            tel_employe: input.tel_employe,
            role: input.role,
            mdp_employe: input.mdp_employe,
        },
    };
};

// POST /api/employees/login - Connexion du personnel (session de 30 minutes)
// Body : { email, mdp }
const login = async (req, res) => {
    const { mdp } = req.body || {};
    const email = normalizeEmail(req.body?.email);

    if (!isValidEmail(email) || typeof mdp !== "string" || mdp.length === 0) {
        return res.status(400).json({ message: "Email et mot de passe obligatoires" });
    }

    try {
        const employee = await findEmployeeByEmail(email);
        // Message identique si l'email est inconnu ou si le mot de passe est faux
        if (!(await verifyPassword(mdp, employee?.mdp_employe))) {
            return res.status(401).json({ message: "Email ou mot de passe incorrect" });
        }

        sendAuthCookie(res, { id: employee.num_employe, role: employee.role }, STAFF_SESSION_SECONDS);
        res.json({
            message: "Connexion réussie",
            employe: await findEmployeeById(employee.num_employe),
        });
    } catch (error) {
        console.error("Erreur de connexion de l'employé", error.message);
        res.status(500).json({ message: "Erreur lors de la connexion" });
    }
};

// POST /api/employees/logout
const logout = (req, res) => {
    clearAuthCookie(res);
    res.json({ message: "Déconnexion réussie" });
};

// GET /api/employees (administrateur)
const getAll = async (req, res) => {
    try {
        const employes = await getAllEmployees();
        res.json({ message: "Employés récupérés avec succès", count: employes.length, employes });
    } catch (error) {
        console.error("Erreur de récupération des employés", error.message);
        res.status(500).json({ message: "Erreur de récupération des employés" });
    }
};

// POST /api/employees (administrateur)
const create = async (req, res) => {
    const { employee, errors } = buildEmployee(req.body || {}, true);
    if (errors) {
        return validationError(res, errors);
    }

    try {
        const id = await createEmployee({
            ...employee,
            mdp_employe: await hashPassword(employee.mdp_employe),
        });
        res.status(201).json({ message: "Employé créé avec succès", employe: await findEmployeeById(id) });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "Un employé existe déjà avec cet email" });
        }
        console.error("Erreur de création de l'employé", error.message);
        res.status(500).json({ message: "Erreur de création de l'employé" });
    }
};

// PUT /api/employees/:id (administrateur)
const update = async (req, res) => {
    const employeeId = parseId(req.params.id);
    if (!employeeId) {
        return res.status(400).json({ message: "Identifiant d'employé invalide" });
    }
    const { employee, errors } = buildEmployee(req.body || {}, false);
    if (errors) {
        return validationError(res, errors);
    }
    // L'administrateur ne peut pas se retirer lui-même ses droits (évite de perdre tout accès admin)
    if (employeeId === req.user.id && employee.role !== req.user.role) {
        return res.status(400).json({ message: "Vous ne pouvez pas modifier votre propre rôle" });
    }

    try {
        const hashedPassword = employee.mdp_employe
            ? await hashPassword(employee.mdp_employe)
            : null;
        const affectedRows = await updateEmployee(employeeId, { ...employee, mdp_employe: hashedPassword });
        if (affectedRows === 0) {
            return res.status(404).json({ message: "Employé non trouvé" });
        }
        res.json({ message: "Employé mis à jour avec succès", employe: await findEmployeeById(employeeId) });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "Un employé existe déjà avec cet email" });
        }
        console.error("Erreur de mise à jour de l'employé", error.message);
        res.status(500).json({ message: "Erreur de mise à jour de l'employé" });
    }
};

// DELETE /api/employees/:id (administrateur)
const remove = async (req, res) => {
    const employeeId = parseId(req.params.id);
    if (!employeeId) {
        return res.status(400).json({ message: "Identifiant d'employé invalide" });
    }
    if (employeeId === req.user.id) {
        return res.status(400).json({ message: "Vous ne pouvez pas supprimer votre propre compte" });
    }

    try {
        const affectedRows = await deleteEmployee(employeeId);
        if (affectedRows === 0) {
            return res.status(404).json({ message: "Employé non trouvé" });
        }
        res.json({ message: "Employé supprimé avec succès" });
    } catch (error) {
        console.error("Erreur de suppression de l'employé", error.message);
        res.status(500).json({ message: "Erreur de suppression de l'employé" });
    }
};

module.exports = { login, logout, getAll, create, update, remove };
