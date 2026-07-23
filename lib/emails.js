/* Modèles d'e-mails transactionnels (HTML + texte).
 * Le logo est joint en pièce inline (cid) — voir mailer.js. */

const config = require("../config");
const C = config.couleurs;

function baseTemplate(titre, corpsHtml) {
  const l = config.liens;
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f2f6f3;font-family:Arial,Helvetica,sans-serif;color:${C.texteFonce};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f6f3;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 6px 20px rgba(0,0,0,.08);">
        <tr><td align="center" style="background:${C.vert};padding:26px 20px;">
          <img src="{{BASE}}/img/logo-subway.png" alt="Subway" height="34" style="height:34px;display:block;">
        </td></tr>
        <tr><td style="padding:30px 30px 10px;">
          <h1 style="margin:0 0 14px;font-size:22px;color:${C.vertFonce};">${titre}</h1>
          ${corpsHtml}
        </td></tr>
        <tr><td style="padding:20px 30px 28px;">
          <hr style="border:none;border-top:1px solid #e3ece6;margin:0 0 16px;">
          <p style="font-size:11px;line-height:1.6;color:#7a8e82;margin:0;">
            Vous recevez cet e-mail car vous avez participé au jeu de la roue Subway.
            <a href="{{BASE}}${l.reglement}" style="color:#7a8e82;">Règlement</a> ·
            <a href="{{BASE}}${l.confidentialite}" style="color:#7a8e82;">Confidentialité</a> ·
            <a href="{{BASE}}${l.mentionsLegales}" style="color:#7a8e82;">Mentions légales</a><br>
            Conformément au RGPD, vous pouvez demander l'accès, la rectification ou la suppression
            de vos données en écrivant à ${config.event.emailContact}.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function emailGagnant(p) {
  const corps = `
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">Félicitations 🎉 Tu as gagné :</p>
    <p style="font-size:22px;font-weight:bold;color:${C.vert};margin:0 0 20px;">${p.lot_nom}</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;">
      <tr><td align="center" style="background:${C.jaune};border-radius:12px;padding:18px;">
        <div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:${C.texteFonce};font-weight:bold;">Ton code de preuve</div>
        <div style="font-size:28px;font-weight:bold;letter-spacing:2px;color:${C.texteFonce};font-family:'Courier New',monospace;">${p.code}</div>
      </td></tr>
    </table>
    <p style="font-size:15px;line-height:1.6;margin:0;">
      Présente ce code (cet e-mail ou une capture d'écran) au comptoir du restaurant Subway
      de ${config.event.ville} pour récupérer ton lot. À très vite&nbsp;!
    </p>`;
  return {
    subject: config.email.objetGagnant,
    html: baseTemplate("Bravo, tu as gagné !", corps),
    text: `Felicitations ! Tu as gagne : ${p.lot_nom}\nTon code de preuve : ${p.code}\n`
        + `Presente ce code au comptoir Subway de ${config.event.ville} pour recuperer ton lot.`,
  };
}

function emailPerdant(p) {
  const corps = `
    <p style="font-size:15px;line-height:1.6;margin:0 0 16px;">Merci d'avoir tenté ta chance à la roue Subway !</p>
    <p style="font-size:15px;line-height:1.6;margin:0;">${config.perdu.message}
    Passe nous voir au restaurant de ${config.event.ville} pour l'ouverture 🥪</p>`;
  return {
    subject: config.email.objetPerdant,
    html: baseTemplate("Merci d'avoir joué !", corps),
    text: `Merci d'avoir joue a la roue Subway ! ${config.perdu.message}`,
  };
}

// Remplace {{BASE}} par l'URL publique (fournie au moment de l'envoi).
function withBase(mail, baseUrl) {
  return { ...mail, html: mail.html.replaceAll("{{BASE}}", baseUrl || "") };
}

module.exports = { emailGagnant, emailPerdant, withBase };
