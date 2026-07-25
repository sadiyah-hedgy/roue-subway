/* ============================================================================
 *  SERVEUR — ROUE DE LA FORTUNE OUVERTURE SUBWAY
 *  Express + SQLite intégré à Node (node:sqlite) => AUCUNE compilation native.
 *  - Stock réel décrémenté de façon ATOMIQUE (aucun sur-tirage possible).
 *  - 1 participation par e-mail.
 *  - Chaque gagnant reçoit un CODE DE PREUVE unique (à envoyer par mail ensuite).
 *  - Page admin : stock en direct + export CSV des participants.
 *
 *  Nécessite Node.js >= 22.5 (module node:sqlite intégré).
 * ========================================================================== */

// Charge le fichier .env (secrets SMTP / Google Sheet) — natif à Node 22, sans dépendance.
try { process.loadEnvFile(); } catch (_) { /* pas de .env : on continue sans */ }

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const { DatabaseSync } = require("node:sqlite");
const config = require("./config");
const mailer = require("./lib/mailer");
const sheet = require("./lib/sheet");

const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || path.join(__dirname, "data", "roue.db");

/* --- Base de données ------------------------------------------------------ */
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA busy_timeout = 5000;");

db.exec(`
  CREATE TABLE IF NOT EXISTS stock (
    lot_id  TEXT PRIMARY KEY,
    nom     TEXT NOT NULL,
    restant INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS participations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT NOT NULL,
    lot_id     TEXT NOT NULL,
    lot_nom    TEXT NOT NULL,
    gagnant    INTEGER NOT NULL,
    code       TEXT,
    newsletter INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_email ON participations(email);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_code  ON participations(code);
`);

// Migration douce : ajoute la colonne newsletter si une ancienne base existe.
try { db.exec("ALTER TABLE participations ADD COLUMN newsletter INTEGER NOT NULL DEFAULT 0"); } catch (_) {}

// Initialise le stock depuis config.js (une seule fois, ne réécrase pas).
const initStock = db.prepare("INSERT OR IGNORE INTO stock (lot_id, nom, restant) VALUES (?, ?, ?)");
for (const lot of config.lots) initStock.run(lot.id, lot.nom, lot.stock);

/* --- Requêtes préparées --------------------------------------------------- */
const qFindEmail  = db.prepare("SELECT * FROM participations WHERE email = ?");
const qGetStock   = db.prepare("SELECT lot_id, restant FROM stock");
const qDecrement  = db.prepare("UPDATE stock SET restant = restant - 1 WHERE lot_id = ? AND restant > 0");
const qSetStock   = db.prepare("UPDATE stock SET restant = ? WHERE lot_id = ?");
const qInsertPart = db.prepare(
  "INSERT INTO participations (email, lot_id, lot_nom, gagnant, code, newsletter, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
);
const qAllParts   = db.prepare("SELECT * FROM participations ORDER BY id ASC");

/* --- Helpers -------------------------------------------------------------- */
function emailValide(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function genererCode() {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O/1/I
  const bloc = () => Array.from({ length: 4 }, () => A[crypto.randomInt(A.length)]).join("");
  return `SUB-${bloc()}-${bloc()}`;
}

function stockMap() {
  const m = {};
  for (const r of qGetStock.all()) m[r.lot_id] = r.restant;
  return m;
}

/*
 * Coeur du tirage — exécuté dans UNE transaction (BEGIN IMMEDIATE) pour
 * garantir l'atomicité : la vérif d'email, le tirage pondéré et la
 * décrémentation du stock sont indivisibles. Aucun lot ne peut passer sous 0.
 */
function tirage(email, newsletter) {
  db.exec("BEGIN IMMEDIATE;");
  try {
    if (config.options.uneParticipationParEmail) {
      const deja = qFindEmail.get(email);
      if (deja) { db.exec("COMMIT;"); return { deja: true, participation: deja }; }
    }

    const dispo = stockMap();
    const candidats = [];
    for (const lot of config.lots) {
      if ((dispo[lot.id] || 0) > 0) candidats.push({ ...lot, gagnant: 1 });
    }
    candidats.push({ ...config.perdu, gagnant: 0 });

    const total = candidats.reduce((s, c) => s + c.poids, 0);
    let tick = crypto.randomInt(total * 1000) / 1000;
    let choisi = candidats[candidats.length - 1];
    for (const c of candidats) {
      if (tick < c.poids) { choisi = c; break; }
      tick -= c.poids;
    }

    if (choisi.gagnant === 1) {
      const res = qDecrement.run(choisi.id);
      if (res.changes !== 1) choisi = { ...config.perdu, gagnant: 0 }; // rupture pile au tirage
    }

    const participation = {
      email,
      lot_id: choisi.id,
      lot_nom: choisi.nom,
      gagnant: choisi.gagnant,
      code: choisi.gagnant === 1 ? genererCode() : null,
      newsletter: newsletter ? 1 : 0,
      created_at: new Date().toISOString(),
    };
    qInsertPart.run(
      participation.email, participation.lot_id, participation.lot_nom,
      participation.gagnant, participation.code, participation.newsletter, participation.created_at
    );
    db.exec("COMMIT;");
    return { deja: false, participation };
  } catch (e) {
    try { db.exec("ROLLBACK;"); } catch (_) {}
    throw e;
  }
}

/* --- App ------------------------------------------------------------------ */
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/config", (req, res) => {
  res.json({
    event: config.event,
    couleurs: config.couleurs,
    liens: config.liens,
    lots: config.lots.map((l) => ({
      id: l.id, nom: l.nom, couleur: l.couleur, couleurTexte: l.couleurTexte, emoji: l.emoji,
    })),
    perdu: {
      id: config.perdu.id, nom: config.perdu.nom, couleur: config.perdu.couleur,
      couleurTexte: config.perdu.couleurTexte, emoji: config.perdu.emoji, message: config.perdu.message,
    },
  });
});

app.get("/api/check", (req, res) => {
  const email = (req.query.email || "").toString().trim().toLowerCase();
  if (!emailValide(email)) return res.json({ ok: false, raison: "email" });
  res.json({ ok: true, dejaJoue: !!qFindEmail.get(email) });
});

app.post("/api/spin", (req, res) => {
  const body = req.body || {};
  const email = (body.email || "").toString().trim().toLowerCase();
  const reglement = body.reglement === true || body.reglement === "true";
  const newsletter = body.newsletter === true || body.newsletter === "true";
  if (!emailValide(email)) {
    return res.status(400).json({ ok: false, raison: "email", message: "Adresse e-mail invalide." });
  }
  if (!reglement) {
    return res.status(400).json({ ok: false, raison: "reglement", message: "Merci d'accepter le règlement pour participer." });
  }
  try {
    const { deja, participation } = tirage(email, newsletter);
    if (deja) {
      return res.status(409).json({
        ok: false, raison: "deja_joue", message: "Cette adresse e-mail a déjà participé.",
        resultat: {
          lot_id: participation.lot_id, lot_nom: participation.lot_nom,
          gagnant: !!participation.gagnant, code: participation.code,
        },
      });
    }
    // Répond tout de suite ; e-mail + Google Sheet partent en arrière-plan.
    res.json({
      ok: true,
      resultat: {
        lot_id: participation.lot_id, lot_nom: participation.lot_nom,
        gagnant: !!participation.gagnant, code: participation.code,
      },
    });
    mailer.envoyerParticipation(participation);
    sheet.pousser(participation);
  } catch (e) {
    console.error("Erreur /api/spin :", e);
    res.status(500).json({ ok: false, message: "Erreur serveur, réessaie." });
  }
});

/* --- ADMIN ---------------------------------------------------------------- */
function adminAutorise(req) {
  return (req.query.cle || req.headers["x-admin-cle"]) === config.admin.cle;
}

app.get("/api/admin/stats", (req, res) => {
  if (!adminAutorise(req)) return res.status(401).json({ ok: false });
  const parts = qAllParts.all();
  const stock = qGetStock.all();
  const stockDetail = config.lots.map((l) => {
    const s = stock.find((x) => x.lot_id === l.id);
    const restant = s ? s.restant : 0;
    return { id: l.id, nom: l.nom, initial: l.stock, restant, distribues: l.stock - restant };
  });
  res.json({
    ok: true,
    participantsPrevus: config.options.participantsPrevus,
    totalParticipations: parts.length,
    totalGagnants: parts.filter((p) => p.gagnant).length,
    totalPerdus: parts.filter((p) => !p.gagnant).length,
    stock: stockDetail,
  });
});

app.get("/api/admin/export.csv", (req, res) => {
  if (!adminAutorise(req)) return res.status(401).send("Non autorisé");
  const parts = qAllParts.all();
  const esc = (v) => `"${String(v == null ? "" : v).replace(/"/g, '""')}"`;
  const lignes = [["id", "email", "lot_id", "lot", "gagnant", "code_preuve", "newsletter", "date"].join(",")];
  for (const p of parts) {
    lignes.push([
      p.id, esc(p.email), p.lot_id, esc(p.lot_nom),
      p.gagnant ? "OUI" : "NON", esc(p.code || ""), p.newsletter ? "OUI" : "NON", esc(p.created_at),
    ].join(","));
  }
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", 'attachment; filename="participants-subway.csv"');
  res.send("﻿" + lignes.join("\n")); // BOM pour Excel
});

// Mise à jour manuelle des quantités restantes (comptage au restaurant).
app.post("/api/admin/stock", (req, res) => {
  if (!adminAutorise(req)) return res.status(401).json({ ok: false });
  const updates = (req.body && req.body.updates) || [];
  if (!Array.isArray(updates)) return res.status(400).json({ ok: false, message: "Format invalide" });
  const valides = new Set(config.lots.map((l) => l.id));
  try {
    db.exec("BEGIN IMMEDIATE;");
    for (const u of updates) {
      const id = String(u && u.lot_id);
      let r = parseInt(u && u.restant, 10);
      if (!valides.has(id) || !Number.isFinite(r) || r < 0) continue;
      if (r > 100000) r = 100000;
      qSetStock.run(r, id);
    }
    db.exec("COMMIT;");
  } catch (e) {
    try { db.exec("ROLLBACK;"); } catch (_) {}
    console.error("Erreur /api/admin/stock :", e);
    return res.status(500).json({ ok: false });
  }
  res.json({ ok: true, stock: qGetStock.all() });
});

app.get("/admin", (req, res) => res.sendFile(path.join(__dirname, "public", "admin.html")));

/* --- Pages légales / RGPD ------------------------------------------------- */
app.get("/reglement",        (req, res) => res.sendFile(path.join(__dirname, "public", "reglement.html")));
app.get("/confidentialite",  (req, res) => res.sendFile(path.join(__dirname, "public", "confidentialite.html")));
app.get("/mentions-legales", (req, res) => res.sendFile(path.join(__dirname, "public", "mentions-legales.html")));

app.listen(PORT, () => {
  console.log(`✅ Roue Subway en ligne : http://localhost:${PORT}`);
  console.log(`   Admin        : http://localhost:${PORT}/admin?cle=${config.admin.cle}`);
  console.log(`   E-mail auto  : ${mailer.statut()}`);
  console.log(`   Google Sheet : ${sheet.statut()}`);
});
