/* Écriture temps réel dans un Google Sheet via un webhook Apps Script.
 * URL dans .env : SHEETS_WEBHOOK_URL  (voir apps-script/Code.gs + README).
 * Non bloquant : n'empêche jamais une participation. La base SQLite reste la
 * source de vérité ; le Sheet est un miroir qui s'actualise en direct. */

const config = require("../config");
const URL = process.env.SHEETS_WEBHOOK_URL || "";
const SECRET = process.env.SHEETS_SECRET || "";

let raison = "";
if (!config.sheet.actif) raison = "sheet.actif = false dans config.js";
else if (!URL) raison = "SHEETS_WEBHOOK_URL absent (.env). Google Sheet désactivé.";

function actif() { return config.sheet.actif && !!URL; }
function statut() { return actif() ? "actif" : `inactif (${raison})`; }

function pousser(p) {
  if (!actif()) return Promise.resolve({ ok: false, raison });
  const payload = {
    secret: SECRET,
    date: p.created_at,
    email: p.email,
    lot: p.lot_nom,
    gagnant: p.gagnant ? "OUI" : "NON",
    code: p.code || "",
    newsletter: p.newsletter ? "OUI" : "NON",
  };
  // Timeout court pour ne pas retenir la requête.
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  return fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: ctrl.signal,
  }).then((r) => ({ ok: r.ok }))
    .catch((e) => { console.error("📄 Échec push Google Sheet:", e.message); return { ok: false, raison: e.message }; })
    .finally(() => clearTimeout(t));
}

module.exports = { pousser, actif, statut };
