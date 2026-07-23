/* Test bout-en-bout dans UN seul processus : démarre le serveur en require,
 * puis tape dessus via fetch. Évite toute gestion de process en arrière-plan. */
process.env.PORT = process.env.PORT || "3466";
process.env.DB_PATH = "/tmp/e2e-roue.db";
require("fs").rmSync(process.env.DB_PATH, { force: true });
require("fs").rmSync(process.env.DB_PATH + "-wal", { force: true });
require("fs").rmSync(process.env.DB_PATH + "-shm", { force: true });

require("../server.js"); // démarre app.listen
const BASE = "http://localhost:" + process.env.PORT;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await sleep(600);
  let ok = true;
  const check = (label, cond) => { console.log((cond ? "✅" : "❌") + " " + label); if (!cond) ok = false; };

  // 1. spin valide avec newsletter
  let r = await fetch(BASE + "/api/spin", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "a@test.fr", reglement: true, newsletter: true }) });
  let j = await r.json();
  check("spin valide -> ok", r.status === 200 && j.ok === true);
  check("resultat a un lot_id", !!j.resultat.lot_id);

  // 2. refus sans reglement
  r = await fetch(BASE + "/api/spin", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "b@test.fr", reglement: false }) });
  check("sans reglement -> 400", r.status === 400);

  // 3. double participation
  r = await fetch(BASE + "/api/spin", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "a@test.fr", reglement: true }) });
  check("double email -> 409", r.status === 409);

  // 4. pages légales
  for (const p of ["reglement", "confidentialite", "mentions-legales"]) {
    r = await fetch(BASE + "/" + p); check("/" + p + " -> 200", r.status === 200);
  }

  // 5. config: 5 lots + liens
  j = await (await fetch(BASE + "/api/config")).json();
  check("config: 5 lots (cookies inclus)", j.lots.length === 5 && j.lots.some((l) => l.id === "cookies"));
  check("config: sub15 présent", j.lots.some((l) => l.id === "sub15"));
  check("config: liens présents", j.liens && j.liens.confidentialite === "/confidentialite");

  // 6. CSV avec newsletter + valeur enregistrée
  const csv = await (await fetch(BASE + "/api/admin/export.csv?cle=subway-ouverture-2026")).text();
  check("CSV a colonne newsletter", csv.split("\n")[0].includes("newsletter"));
  check("CSV enregistre newsletter=OUI pour a@test.fr", /a@test\.fr.*OUI/.test(csv));

  console.log(ok ? "\n✅ E2E OK" : "\n❌ E2E ÉCHOUÉ");
  process.exit(ok ? 0 : 1);
}
main();
