const db = require("../../db");

const getAllPromotions = async () => {
    const [rows] = await db.query("SELECT * FROM promotion");
    return rows;
};

const getActivePromotions = async () => {
    const [rows] = await db.query(
        "SELECT * FROM promotion WHERE active = 1 AND date_debut <= NOW() AND date_fin >= NOW()"
    );
    return rows;
};

const getPromotionById = async (id) => {
    const [rows] = await db.query("SELECT * FROM promotion WHERE code_promo = ?", [id]);
    return rows;
};

module.exports = { getAllPromotions, getActivePromotions, getPromotionById };
