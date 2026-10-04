const db = require("../../db");

// Colonnes publiques d'un employé (sans le mot de passe haché)
const PUBLIC_COLUMNS = "num_employe, nom_employe, prenom_employe, email_employe, tel_employe, role";

// AVEC l'empreinte du mot de passe : réservé à l'authentification
const findEmployeeByEmail = async (email) => {
    const [rows] = await db.query("SELECT * FROM employe WHERE email_employe = ?", [email]);
    return rows[0];
};

const findEmployeeById = async (id) => {
    const [rows] = await db.query(`SELECT ${PUBLIC_COLUMNS} FROM employe WHERE num_employe = ?`, [id]);
    return rows[0];
};

const getAllEmployees = async () => {
    const [rows] = await db.query(`SELECT ${PUBLIC_COLUMNS} FROM employe ORDER BY nom_employe, prenom_employe`);
    return rows;
};

const createEmployee = async ({ nom_employe, prenom_employe, email_employe, tel_employe, role, mdp_employe }) => {
    const [result] = await db.query(
        `INSERT INTO employe (nom_employe, prenom_employe, email_employe, tel_employe, role, mdp_employe)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [nom_employe, prenom_employe, email_employe, tel_employe, role, mdp_employe]
    );
    return result.insertId;
};

// Mise à jour des informations (le mot de passe n'est modifié que s'il est fourni)
const updateEmployee = async (id, { nom_employe, prenom_employe, email_employe, tel_employe, role, mdp_employe }) => {
    const [result] = await db.query(
        `UPDATE employe
         SET nom_employe = ?, prenom_employe = ?, email_employe = ?, tel_employe = ?, role = ?,
             mdp_employe = COALESCE(?, mdp_employe)
         WHERE num_employe = ?`,
        [nom_employe, prenom_employe, email_employe, tel_employe, role, mdp_employe || null, id]
    );
    return result.affectedRows;
};

// Les clients créés par cet employé sont conservés (FK ON DELETE SET NULL)
const deleteEmployee = async (id) => {
    const [result] = await db.query("DELETE FROM employe WHERE num_employe = ?", [id]);
    return result.affectedRows;
};

module.exports = {
    findEmployeeByEmail,
    findEmployeeById,
    getAllEmployees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
};
