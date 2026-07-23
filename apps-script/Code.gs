/**
 * GOOGLE APPS SCRIPT — Réception des participations dans un Google Sheet
 * ---------------------------------------------------------------------------
 * MISE EN PLACE (5 min, aucune compétence technique) :
 *  1. Créez un Google Sheet (sheets.new) dans votre Drive.
 *  2. Menu  Extensions ▸ Apps Script.
 *  3. Effacez le code par défaut, collez CE fichier entièrement.
 *  4. Remplacez la valeur de SECRET ci-dessous par un mot de passe de votre choix
 *     (le même que SHEETS_SECRET dans le fichier .env du serveur).
 *  5. Cliquez sur  Déployer ▸ Nouveau déploiement ▸ type « Application Web ».
 *       - Exécuter en tant que : Moi
 *       - Qui a accès : Tout le monde
 *  6. Copiez l'URL d'application web fournie → c'est votre SHEETS_WEBHOOK_URL
 *     (à mettre dans le .env du serveur).
 *  Le Sheet se remplit alors tout seul, en temps réel, à chaque participation.
 */

const SECRET = "CHANGEZ-MOI"; // doit être identique à SHEETS_SECRET du serveur

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (SECRET && data.secret !== SECRET) {
      return ContentService.createTextOutput("unauthorized").setMimeType(ContentService.MimeType.TEXT);
    }
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    // En-têtes créés au premier passage.
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["Date", "E-mail", "Lot", "Gagnant", "Code de preuve", "Newsletter"]);
      sheet.getRange(1, 1, 1, 6).setFontWeight("bold");
    }
    sheet.appendRow([data.date, data.email, data.lot, data.gagnant, data.code, data.newsletter]);
    return ContentService.createTextOutput("ok").setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput("error: " + err).setMimeType(ContentService.MimeType.TEXT);
  }
}
