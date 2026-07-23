# 🥪 Roue de la fortune — Grande Ouverture Subway

Un mini-site où chaque visiteur entre son e-mail, fait tourner une roue à la
charte Subway, et découvre s'il gagne un lot. Le stock est géré **réellement**
côté serveur, chaque gagnant reçoit **automatiquement un e-mail** avec son code
de preuve, et **chaque participation s'inscrit en temps réel dans un Google
Sheet**. Les pages légales (règlement, RGPD, mentions légales) sont incluses.

## ✨ Fonctionnalités

- Roue animée aux **couleurs officielles Subway**, logo officiel intégré.
- Saisie e-mail + **double consentement** (règlement obligatoire / newsletter facultative).
- **1 seule participation par adresse e-mail.**
- **E-mail automatique** selon le résultat : gagnant (lot + code de preuve) ou
  perdant (remerciement).
- **Google Sheet en temps réel** : chaque participation s'ajoute toute seule.
- Décrémentation **atomique** du stock : jamais de lot distribué en rupture.
- Espace **admin** : stock en direct + export **CSV**.
- **Pages légales** prêtes : `/reglement`, `/confidentialite` (RGPD), `/mentions-legales`.

## 🎁 Lots et dosage (pour ~500 personnes)

| Lot            | Stock | Proba/tour |
|----------------|-------|------------|
| Cookie offert  | 50    | 10 %       |
| Sub 15 offert  | 50    | 10 %       |
| Tote bag       | 50    | 10 %       |
| Décapsuleur    | 50    | 10 %       |
| Mug            | 20    | 4 %        |
| Dommage (perdu)| —     | 56 %       |

À 500 joueurs, ~44 % de gain et le stock se vide quasiment pile (220 lots).
Moins de monde → il reste du stock ; plus de monde → les lots épuisés basculent
en « Dommage ». Tout se règle dans **`config.js`**.

## ⚙️ Ce qui se règle où

- **`config.js`** — lots, stocks, probabilités, couleurs, textes, ville, liens,
  mot de passe admin, activation e-mail/Sheet.
- **`.env`** (à créer depuis `.env.example`) — les **secrets** : identifiants
  SMTP, URL du webhook Google Sheet, chemin de la base.
- **`public/img/`** — le logo (déjà en place).
- **Pages légales** dans `public/` — à compléter avec vos infos société
  (champs surlignés `[À COMPLÉTER]`).

## ▶️ Lancer en local

Prérequis : **Node.js ≥ 22.5** (module SQLite intégré ; dépendances : Express + Nodemailer).

```bash
npm install
cp .env.example .env      # puis remplir (facultatif en local)
npm start
```

- Jeu : http://localhost:3000
- Admin : http://localhost:3000/admin?cle=subway-ouverture-2026
- Test complet : `npm test` (charge/stock) ou `node test/e2e.js` (bout-en-bout)

Sans `.env`, le site fonctionne : la roue tourne et enregistre les participations,
mais l'e-mail et le Google Sheet restent simplement désactivés (indiqué au démarrage).

## ✉️ Activer l'envoi d'e-mails (SMTP)

Recommandé : **Brevo** (ex-Sendinblue), gratuit jusqu'à ~300 e-mails/jour.

1. Créez un compte Brevo → menu **SMTP & API** → notez l'hôte, le login et la clé SMTP.
2. Dans `.env`, remplissez `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`.
3. Dans `config.js`, ajustez `email.from` (adresse expéditrice) et
   `event.ville` / `emailContact`.
4. Redémarrez : le démarrage affiche « E-mail auto : actif ».

Fonctionne aussi avec Mailjet, OVH, Gmail, etc. (mêmes réglages SMTP).

## 📄 Activer le Google Sheet temps réel

Le serveur envoie chaque participation à un petit **script Google Apps Script**
qui écrit dans votre feuille. Mise en place (~5 min, sans compétence technique) :

1. Créez une feuille sur **sheets.new**.
2. **Extensions ▸ Apps Script**, collez le contenu de `apps-script/Code.gs`.
3. Changez la constante `SECRET` (un mot de passe de votre choix).
4. **Déployer ▸ Nouveau déploiement ▸ Application Web** — Exécuter en tant que
   « Moi », accès « Tout le monde » — puis copiez l'URL fournie.
5. Dans `.env` : `SHEETS_WEBHOOK_URL=` (l'URL) et `SHEETS_SECRET=` (le même mot de passe).
6. Redémarrez : « Google Sheet : actif ». La feuille se remplit en direct.

> La base SQLite reste la source de vérité (et l'export CSV votre filet de
> sécurité) ; le Sheet en est un miroir vivant.

## ⚖️ Pages légales / RGPD

Trois pages sont déjà en ligne et liées dans le pied de page et le formulaire :
`/reglement`, `/confidentialite`, `/mentions-legales`. **Ouvrez ces trois fichiers
dans `public/` et remplacez tous les champs surlignés** (raison sociale, SIREN,
adresse, e-mail de contact, hébergeur, durée de conservation…). C'est indispensable
avant l'ouverture pour être conforme.

## 🚀 Mise en ligne (Render.com, gratuit)

1. Poussez ce dossier sur GitHub.
2. Render → **New ▸ Web Service** → build `npm install`, start `npm start`, Node 22+.
3. **Disque persistant** (Render ▸ Disks, ex. monté sur `/data`) + variable
   `DB_PATH=/data/roue.db` — sinon la base repart à zéro à chaque redéploiement.
4. Ajoutez vos variables d'environnement (`.env`) dans **Environment**.
5. Mettez `PUBLIC_URL` = l'URL Render (pour les liens dans les e-mails).
6. Déployez → générez un **QR code** vers l'URL à afficher en boutique.

## ✅ Checklist avant l'ouverture

- [ ] Compléter les 3 pages légales (`public/reglement.html`, `confidentialite.html`, `mentions-legales.html`).
- [ ] Renseigner `event.ville` et `emailContact` dans `config.js`.
- [ ] **Changer `admin.cle`** (mot de passe admin).
- [ ] Configurer le SMTP (`.env`) et tester un envoi.
- [ ] Configurer le webhook Google Sheet (`.env` + Apps Script).
- [ ] Disque persistant (`DB_PATH`) sur l'hébergeur.
- [ ] Définir `PUBLIC_URL`.

## 🗂️ Structure

```
subway-roue/
├── config.js              ← lots, stock, couleurs, textes, liens, admin
├── .env.example           ← modèle des secrets (SMTP, Sheet) → copier en .env
├── server.js              ← serveur (tirage atomique, e-mail, Sheet, CSV)
├── lib/
│   ├── emails.js          ← modèles d'e-mails (gagnant / perdant)
│   ├── mailer.js          ← envoi SMTP (Nodemailer)
│   └── sheet.js           ← push temps réel vers Google Sheet
├── apps-script/Code.gs    ← script à coller dans Google Apps Script
├── public/
│   ├── index.html         ← la roue
│   ├── admin.html         ← tableau de bord
│   ├── reglement.html · confidentialite.html · mentions-legales.html
│   └── img/logo-subway.png
├── data/                  ← base SQLite (créée au 1er lancement)
└── test/                  ← simulate.js (charge) · e2e.js (bout-en-bout)
```
