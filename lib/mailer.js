/* Envoi d'e-mails transactionnels via l'API HTTPS de Brevo.
 * ----------------------------------------------------------------------------
 * Pourquoi l'API et pas le SMTP : de nombreux hébergeurs (dont Render) bloquent
 * les ports SMTP sortants. L'API Brevo passe par HTTPS (port 443), jamais bloqué.
 *
 * Configuration (.env / variables Render) :
 *   BREVO_API_KEY = clé API v3 de Brevo (commence par "xkeysib-")
 *                   → Brevo ▸ SMTP & API ▸ onglet "API Keys" ▸ Générer une clé
 *   PUBLIC_URL    = URL publique du site (pour le logo et les liens des e-mails)
 *
 * Si la clé n'est pas fournie ou email.actif = false, l'envoi est ignoré
 * proprement (sans jamais faire échouer une participation). */

const config = require("../config");
const { emailGagnant, emailPerdant, withBase } = require("./emails");

const API_KEY = process.env.BREVO_API_KEY || "";
const BASE_URL = process.env.PUBLIC_URL || "";

// Transforme 'Nom <email>' en { name, email } pour l'API Brevo.
function parseFrom(s) {
  const m = String(s).match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: (m[1].trim() || "Subway"), email: m[2].trim() };
  return { name: "Subway", email: String(s).trim() };
}
const SENDER = parseFrom(config.email.from);
const REPLY = config.email.repondreA;

let raison = "";
if (!config.email.actif) raison = "email.actif = false dans config.js";
else if (!API_KEY) raison = "BREVO_API_KEY absente (.env / Render). E-mails désactivés.";

function actif() { return config.email.actif && !!API_KEY; }
function statut() { return actif() ? "actif (API Brevo)" : `inactif (${raison})`; }

/* Envoi non bloquant : une participation ne doit jamais échouer à cause d'un
 * souci d'e-mail. Les succès ET les échecs sont loggués pour le diagnostic. */
function envoyerParticipation(p) {
  if (!actif()) return Promise.resolve({ envoye: false, raison });
  if (!p.gagnant && !config.options.emailAuxPerdants) {
    return Promise.resolve({ envoye: false, raison: "perdant (désactivé)" });
  }
  const mail = withBase(p.gagnant ? emailGagnant(p) : emailPerdant(p), BASE_URL);
  const body = {
    sender: SENDER,
    to: [{ email: p.email }],
    replyTo: { email: REPLY },
    subject: mail.subject,
    htmlContent: mail.html,
    textContent: mail.text,
  };
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  return fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": API_KEY, "content-type": "application/json", "accept": "application/json" },
    body: JSON.stringify(body),
    signal: ctrl.signal,
  }).then(async (r) => {
    if (r.ok) { console.log("✉️  E-mail envoyé à", p.email); return { envoye: true }; }
    const txt = await r.text().catch(() => "");
    console.error("✉️  Échec envoi e-mail à", p.email, ":", r.status, txt);
    return { envoye: false, raison: `${r.status} ${txt}` };
  }).catch((e) => {
    console.error("✉️  Échec envoi e-mail à", p.email, ":", e.message);
    return { envoye: false, raison: e.message };
  }).finally(() => clearTimeout(t));
}

module.exports = { envoyerParticipation, actif, statut };
