// Envoi des emails (mot de passe oublié, confirmation de commande)
// MAIL_TRANSPORT choisit le mode d'envoi :
// - "sendmail" : sendmail du serveur (hébergement Plesk), aucun identifiant nécessaire
// - "smtp"     : serveur SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD)
// - "log"      : développement et tests, l'email est affiché dans la console au lieu d'être envoyé
const nodemailer = require("nodemailer");

const createTransport = () => {
    const mode = process.env.MAIL_TRANSPORT || "log";

    if (mode === "sendmail") {
        return nodemailer.createTransport({ sendmail: true, newline: "unix", path: "/usr/sbin/sendmail" });
    }
    if (mode === "smtp") {
        return nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: parseInt(process.env.SMTP_PORT, 10) || 587,
            secure: process.env.SMTP_PORT === "465",
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
        });
    }
    // Mode "log" : nodemailer construit l'email sans l'envoyer
    return nodemailer.createTransport({ jsonTransport: true });
};

const sendMail = async ({ to, subject, text }) => {
    const info = await createTransport().sendMail({
        from: process.env.MAIL_FROM || "CafThé <no-reply@slaurent.dev-campus.fr>",
        to,
        subject,
        text,
    });
    if ((process.env.MAIL_TRANSPORT || "log") === "log" && process.env.NODE_ENV !== "test") {
        console.log(`[email non envoyé, mode log] À : ${to}\n${subject}\n${text}`);
    }
    return info;
};

module.exports = { sendMail };
