/* Envoi d'e-mails transactionnels via SMTP (Nodemailer).
 * Identifiants dans .env : SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.
 * Compatible Brevo (ex-Sendinblue), Mailjet, Gmail, OVH, etc.
 * Si le SMTP n'est pas configuré ou email.actif = false, l'envoi est ignoré
 * (sans casser la participation). */

const path = require("path");
const nodemailer = require("nodemailer");
const config = require("../config");
const { emailGagnant, emailPerdant, withBase } = require("./emails");

const LOGO = path.join(__dirname, "..", "public", "img", "logo-subway.png");
const BASE_URL = process.env.PUBLIC_URL || "";

let transport = null;
let raison = "";

if (!config.email.actif) {
  raison = "email.actif = false dans config.js";
} else if (!process.env.SMTP_HOST) {
  raison = "SMTP non configuré (.env absent). E-mails désactivés.";
} else {
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_SECURE === "true", // true = port 465
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function actif() { return !!transport; }
function statut() { return actif() ? "actif" : `inactif (${raison})`; }

/* Envoi non bloquant : on ne fait jamais échouer une participation à cause
 * d'un souci d'e-mail. Les erreurs sont seulement loguées. */
function envoyerParticipation(p) {
  if (!transport) return Promise.resolve({ envoye: false, raison });
  if (!p.gagnant && !config.options.emailAuxPerdants) {
    return Promise.resolve({ envoye: false, raison: "perdant (désactivé)" });
  }
  const mail = withBase(p.gagnant ? emailGagnant(p) : emailPerdant(p), BASE_URL);
  return transport.sendMail({
    from: config.email.from,
    to: p.email,
    replyTo: config.email.repondreA,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    attachments: [{ filename: "logo-subway.png", path: LOGO, cid: "logosubway" }],
  }).then(() => ({ envoye: true }))
    .catch((e) => { console.error("✉️  Échec envoi e-mail à", p.email, ":", e.message); return { envoye: false, raison: e.message }; });
}

module.exports = { envoyerParticipation, actif, statut };
