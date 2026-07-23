/* ============================================================================
 *  CONFIGURATION DE LA ROUE — OUVERTURE SUBWAY
 *  ----------------------------------------------------------------------------
 *  Le fichier central pour les LOTS, STOCKS, PROBAS, COULEURS, TEXTES et LIENS.
 *  Les SECRETS (identifiants e-mail, URL Google Sheet) se mettent dans un
 *  fichier .env (voir .env.example) — jamais en clair ici.
 *  Après toute modification, redémarrer le serveur.
 * ========================================================================== */

module.exports = {

  /* --- Identité de l'opération ------------------------------------------- */
  event: {
    nom: "Subway",
    titre: "Grande Ouverture",
    sousTitre: "Tourne la roue et tente de gagner !",
    // Logo officiel (version blanche de la charte) déjà intégré.
    logo: "img/logo-subway.png",
    mentions: "Jeu gratuit sans obligation d'achat. 1 participation par adresse e-mail. Dans la limite des stocks disponibles.",
    // Coordonnées affichées / utilisées dans les e-mails et pages légales.
    ville: "[VILLE DU RESTAURANT]",
    emailContact: "contact@[VOTRE-DOMAINE].fr",
  },

  /* --- Charte graphique Subway (EMEA 2020) -------------------------------- */
  couleurs: {
    vert:       "#008938", // Subway Green®  (PMS 2426 C)
    vertFonce:  "#00491E", // Spinach Green (secondaire)
    jaune:      "#F2B700", // Subway Yellow® (PMS 7548 C)
    jauneFonce: "#d9a400",
    blanc:      "#ffffff",
    texteFonce: "#00491E",
  },

  /* --- Lots -------------------------------------------------------------- */
  /*  stock : quantité disponible (décrémentée réellement par le serveur)
   *  poids : probabilité relative par participation
   *
   *  DOSAGE pour ~500 personnes (220 lots) :
   *   - Cookies        : 50/500 = 10 %
   *   - Sub 15 offert  : 50/500 = 10 %
   *   - Tote bag       : 50/500 = 10 %
   *   - Décapsuleur    : 50/500 = 10 %
   *   - Mug            : 20/500 =  4 %
   *   - Perdu          :        = 56 %
   *  Total = 100 %.
   */
  lots: [
    { id: "cookies",     nom: "Cookie offert",  stock: 50, poids: 10, couleur: "#F2B700", couleurTexte: "#00491E", emoji: "🍪" },
    { id: "sub15",       nom: "Sub 15 offert",  stock: 50, poids: 10, couleur: "#008938", couleurTexte: "#ffffff", emoji: "🥪" },
    { id: "totebag",     nom: "Tote bag",       stock: 50, poids: 10, couleur: "#00491E", couleurTexte: "#ffffff", emoji: "👜" },
    { id: "decapsuleur", nom: "Décapsuleur",    stock: 50, poids: 10, couleur: "#ffffff", couleurTexte: "#00491E", emoji: "🍾" },
    { id: "mug",         nom: "Mug",            stock: 20, poids: 4,  couleur: "#97D700", couleurTexte: "#00491E", emoji: "☕" },
  ],

  perdu: {
    id: "perdu",
    nom: "Dommage !",
    poids: 56,
    couleur: "#e8f5ec",
    couleurTexte: "#00491E",
    emoji: "🔁",
    message: "Pas de lot cette fois-ci… mais merci d'être venu fêter l'ouverture avec nous !",
  },

  /* --- Comportement ------------------------------------------------------ */
  options: {
    uneParticipationParEmail: true,
    participantsPrevus: 500,
    // Envoyer aussi un e-mail aux perdants (remerciement) ? true/false
    emailAuxPerdants: true,
  },

  /* --- E-mail automatique ------------------------------------------------ */
  // Les identifiants SMTP se mettent dans .env. Ici : expéditeur + activation.
  email: {
    actif: true,                       // false pour désactiver tout envoi
    from: '"Subway" <no-reply@[VOTRE-DOMAINE].fr>',
    repondreA: "contact@[VOTRE-DOMAINE].fr",
    objetGagnant: "🎉 Ton lot Subway — voici ta preuve",
    objetPerdant: "Merci d'avoir joué à la roue Subway !",
  },

  /* --- Google Sheet (temps réel) ----------------------------------------- */
  // On pousse chaque participation vers un Google Sheet via un webhook
  // Apps Script (voir dossier apps-script/ et le README). URL dans .env.
  sheet: {
    actif: true,                       // false pour désactiver
  },

  /* --- Liens légaux / RGPD ----------------------------------------------- */
  liens: {
    reglement: "/reglement",
    confidentialite: "/confidentialite",
    mentionsLegales: "/mentions-legales",
  },

  /* --- Admin ------------------------------------------------------------- */
  // À CHANGER avant la mise en ligne. Accès : /admin?cle=...
  admin: {
    cle: "subway-ouverture-2026",
  },
};
