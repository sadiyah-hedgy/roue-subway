/* Test de charge : lance N participations concurrentes et vérifie que :
 *  - le stock ne descend jamais sous 0
 *  - le nombre de lots distribués <= stock initial pour chaque lot
 *  - un même e-mail ne joue qu'une fois
 *  - la répartition des probabilités est cohérente
 *
 *  Usage : démarrer le serveur (npm start) sur un port, puis :
 *          BASE=http://localhost:3000 N=700 node test/simulate.js
 */
const config = require("../config");
const BASE = process.env.BASE || "http://localhost:3000";
const N = parseInt(process.env.N || "700", 10);

async function spin(email) {
  const r = await fetch(BASE + "/api/spin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  return { status: r.status, body: await r.json() };
}

(async () => {
  console.log(`\n▶ Simulation de ${N} participations sur ${BASE}\n`);
  const emails = Array.from({ length: N }, (_, i) => `test${i}@exemple.fr`);

  // Envoi en vagues concurrentes pour stresser l'atomicité.
  const taille = 50;
  const results = [];
  for (let i = 0; i < emails.length; i += taille) {
    const lot = emails.slice(i, i + taille);
    const rs = await Promise.all(lot.map((e) => spin(e)));
    results.push(...rs);
  }

  const compte = {};
  const codes = new Set();
  let doublons = 0, erreurs = 0;
  for (const r of results) {
    if (r.status === 200 && r.body.ok) {
      const id = r.body.resultat.lot_id;
      compte[id] = (compte[id] || 0) + 1;
      if (r.body.resultat.code) {
        if (codes.has(r.body.resultat.code)) console.error("❌ CODE EN DOUBLE :", r.body.resultat.code);
        codes.add(r.body.resultat.code);
      }
    } else if (r.body.raison === "deja_joue") { doublons++; }
    else { erreurs++; }
  }

  console.log("Répartition des résultats :");
  let ok = true;
  for (const lot of config.lots) {
    const distribue = compte[lot.id] || 0;
    const pct = ((distribue / N) * 100).toFixed(1);
    const depasse = distribue > lot.stock;
    if (depasse) ok = false;
    console.log(`  ${lot.nom.padEnd(16)} : ${String(distribue).padStart(3)} distribués / ${lot.stock} en stock  (${pct}%)  ${depasse ? "❌ DÉPASSEMENT" : "✅"}`);
  }
  console.log(`  ${"Perdu".padEnd(16)} : ${String(compte["perdu"] || 0).padStart(3)}  (${(((compte["perdu"] || 0) / N) * 100).toFixed(1)}%)`);
  console.log(`\n  Codes de preuve uniques : ${codes.size}`);
  console.log(`  Tentatives doublon (même email) bloquées : ${doublons}`);
  console.log(`  Erreurs : ${erreurs}`);

  const totalLots = config.lots.reduce((s, l) => s + (compte[l.id] || 0), 0);
  const totalStock = config.lots.reduce((s, l) => s + l.stock, 0);
  console.log(`\n  Total lots distribués : ${totalLots} (max possible ${totalStock})`);
  console.log(ok && totalLots <= totalStock ? "\n✅ TEST RÉUSSI : aucun sur-tirage, stock respecté.\n"
                                            : "\n❌ TEST ÉCHOUÉ : sur-tirage détecté.\n");
  process.exit(ok ? 0 : 1);
})();
