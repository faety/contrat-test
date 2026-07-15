# Boyia Institute — cours en ligne & communauté (mobile first)

> **Boyia Institute** — apprends l'IA et l'anglais, simplement.

Webapp mobile first de cours en ligne, **testable immédiatement** : un seul fichier `index.html`, sans installation, sans base de données, sans compte tiers.

## Tester tout de suite

```bash
# Option 1 : ouvrir directement le fichier
# double-clique sur index.html (ou glisse-le dans un navigateur)

# Option 2 : petit serveur local
python3 -m http.server 8080
# puis ouvre http://localhost:8080 (idéalement en mode mobile des DevTools)
```

Aucune donnée ne quitte le navigateur : tout est stocké en `localStorage` (bouton « Réinitialiser la démo » dans Profil).

## Ce que fait l'application

- **Catalogue centré sur 2 domaines : IA et Anglais** — 5 vrais cours :
  - **Comprendre l'IA en 30 minutes** (gratuit) : vraies vidéos YouTube francophones bien ordonnées + fiches de synthèse ;
  - **ChatGPT au travail**, **Claude au travail**, **Copilot au travail** (payants, 5 000 FCFA) : cours **entièrement rédigés**, pédagogiques et compréhensibles **sans vidéo** (emplacements vidéo réservés, à tourner plus tard), cible : employés et futurs employés, usage réel au quotidien ;
  - **Anglais : bien démarrer** (gratuit) : grande leçon vidéo YouTube + fiches pratiques (se présenter, phrases utiles, messages).
  Chaque leçon écrite contient un exemple concret et un exercice « À toi de jouer ».
- **Inscription style Tally** : une question par écran (prénom → nom → numéro WhatsApp avec indicatif pays → e-mail), barre de progression, validation champ par champ, touche Entrée pour avancer, récapitulatif avant confirmation. Le compte n'est demandé **qu'au moment de s'inscrire à un cours** (zéro friction pour explorer).
- **Paiement Wave (Côte d'Ivoire) — réel ou simulé** : Wave est le seul opérateur actif (les autres affichent « Bientôt disponible »).
  - **Mode réel** : servi par `server.js` avec une clé API Wave → bouton « Payer avec Wave » → redirection vers l'app Wave (`wave_launch_url`) → retour dans Boyia Institute → confirmation (webhook signé + réconciliation) → reçu avec l'identifiant de transaction Wave.
  - **Mode démo** (fichier ouvert sans serveur, ou serveur sans clé) : simulation locale, clairement indiquée.
- **Espace d'apprentissage** : leçons par module, « marquer comme terminée », progression par cours.
- **Communauté** (inspirée de Skool) : fil avec catégories (Général, Entraide, Victoires, Annonces), publications, j'aime, commentaires, classement par points (+10 leçon terminée, +5 publication, +2 commentaire).
- **Profil** : informations, points, thème clair/sombre/auto, réinitialisation de la démo.

## Paiement réel avec Wave Côte d'Ivoire (déploiement Vercel + Neon)

**Architecture.** Front statique `index.html` + fonctions serverless dans `api/` + logique
partagée dans `lib/` (`wave.js`, `store.js`, `handlers.js`). Le **même code** tourne en local
(`server.js`) et sur Vercel (dossier `api/`). La clé API Wave ne quitte jamais le serveur ;
le **montant est fixé côté serveur** (`PRICES` dans `lib/wave.js`, à garder en cohérence avec
`COURSES` de `index.html`). Les commandes sont persistées dans **Neon (PostgreSQL)** en
production, ou en mémoire en dev/démo.

Fonctions : `api/health.js` · `api/checkout.js` · `api/order.js` · `api/wave/webhook.js`.
Région Vercel `fra1` (Francfort, proche de Neon et de l'Afrique de l'Ouest) — voir `vercel.json`.

### Déployer sur Vercel

1. **Neon** : crée un projet Neon (région Frankfurt) et récupère la chaîne de connexion
   (`postgresql://…?sslmode=require`). La table `orders` est créée automatiquement au premier
   paiement (`CREATE TABLE IF NOT EXISTS`). ⚠️ Ne mets jamais cette chaîne dans le dépôt.
2. **Wave Business** (business.wave.com) : crée une **clé API** (`wave_ci_prod_…`) et un
   **webhook** vers `https://TON-DOMAINE/api/wave/webhook` ; note le **secret**.
3. **Vercel** : relie le projet `contrat-test` au dépôt GitHub (branche de production), puis
   ajoute les **variables d'environnement** (Settings → Environment Variables) :
   | Variable | Valeur |
   |---|---|
   | `WAVE_API_KEY` | `wave_ci_prod_…` |
   | `WAVE_WEBHOOK_SECRET` | secret du webhook Wave |
   | `DATABASE_URL` | chaîne de connexion Neon |
   | `APP_URL` | l'URL publique (ex. `https://contrat-test.vercel.app`) — optionnel, sinon déduite des en-têtes |
   | `ADMIN_PASSWORD` | mot de passe de l'espace admin (`/boyiaadmin`) |
   | `RESEND_API_KEY` | clé API Resend (`re_…`) — fournisseur d'e-mails recommandé |
   | `MAIL_FROM` | expéditeur vérifié chez Resend (ex. `contact@boyiainstitute.com`) |
   | `NOTIFY_EMAIL` | reçoit une notification à chaque vente — optionnel |
   Redéploie. Sans `WAVE_API_KEY`, le site tourne en **mode démo** (paiement simulé) ;
   sans `DATABASE_URL`, stockage en mémoire (non persistant — à éviter en prod) ;
   sans configuration e-mail, aucun e-mail n'est envoyé (le site fonctionne normalement).

### Comptes serveur (connexion multi-appareils)

De vrais comptes côté serveur (Neon) : un apprenant retrouve ses cours (gratuits et
**payés**) et sa progression depuis n'importe quel téléphone.

- **Inscription fluide** : e-mail nouveau → compte + session créés immédiatement
  (`POST /api/signup`), aucun code à saisir.
- **Connexion sur un autre appareil** : `POST /api/auth/request` envoie un **code à
  6 chiffres** par e-mail (Resend), `POST /api/auth/verify` le vérifie et ouvre une session.
- **Anti-usurpation** : s'inscrire avec un e-mail déjà utilisé exige le code (`needsCode`).
- **Session** : jeton opaque (32 octets) envoyé au client, stocké **haché** en base
  (`sessions`), en-tête `Authorization: Bearer …`. `GET /api/me` renvoie compte +
  inscriptions + progression + points ; `POST /api/logout` invalide la session.
- **Cours & progression** : `POST /api/me/enroll` (cours gratuit) et
  `POST /api/me/progress` (leçon terminée, +10 points, non falsifiable côté serveur).
- **Paiement lié au compte** : au passage en « payé », la commande est rattachée au
  compte de l'acheteur par e-mail (création d'un compte minimal si besoin) → le cours
  payé est accessible partout après connexion.
- Tables Neon créées automatiquement : `users`, `sessions`, `login_codes`,
  `enrollments`, `progress`. Aucune variable d'environnement supplémentaire (réutilise
  `DATABASE_URL` et la configuration e-mail).

### E-mails transactionnels

Trois e-mails automatiques (`lib/mail.js`) :
- **Reçu de paiement** au client dès que la commande passe en « payé » (webhook, réconciliation
  ou inscription gratuite par coupon). Envoyé **une seule fois** (colonne `emailed` en base) ;
  si le SMTP est en panne, le flag n'est pas posé et l'envoi sera retenté à la prochaine
  vérification de la commande.
- **Bienvenue** à la création de compte (`POST /api/welcome`, appelé par le front, non bloquant).
- **Notification de vente** à `NOTIFY_EMAIL` (référence, cours, montant, coupon, contact client).
`GET /api/health` expose `mail: true|false` pour vérifier la configuration.

**Configurer Resend (recommandé, ~5 min)** :
1. Crée un compte sur [resend.com](https://resend.com) (gratuit : 100 e-mails/jour, 3 000/mois).
2. **Domains → Add Domain** : `boyiainstitute.com`, puis ajoute chez Cloudflare (DNS) les
   enregistrements affichés (DKIM/SPF, en « DNS only ») et attends « Verified ».
3. **API Keys → Create API Key** (permission *Sending access*) → copie `re_…`.
4. Sur Vercel, ajoute `RESEND_API_KEY` et `MAIL_FROM=contact@boyiainstitute.com`
   (n'importe quelle adresse du domaine vérifié), puis **Redeploy**.
Avant la vérification du domaine, `MAIL_FROM` peut rester vide : l'envoi part de
`onboarding@resend.dev` mais **uniquement vers l'adresse e-mail de ton compte Resend** (test).

**Alternative SMTP** (Hostinger, Gmail, Brevo… — nodemailer) : `SMTP_HOST`, `SMTP_PORT`
(465 défaut), `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` (défaut : `SMTP_USER`). Utilisée
seulement si `RESEND_API_KEY` est absent.
4. **Circuit d'un paiement** : `POST /api/checkout` (crée la session Wave, `currency: XOF`,
   `client_reference` = référence de commande, montant serveur) → redirection vers
   `wave_launch_url` → l'utilisateur paie dans Wave → Wave appelle le webhook
   (`checkout.session.completed`, signature `Wave-Signature` vérifiée en HMAC-SHA256,
   tolérance 5 min) qui marque la commande payée en base → au retour dans l'app, le front
   sonde `GET /api/order?ref=…` (avec **réconciliation directe** auprès de Wave si le webhook
   tarde) → accès au cours débloqué + reçu.

### Alternative auto-hébergée (un seul process)

`node server.js` sert l'app et les mêmes endpoints (Render, Railway, VPS…) :
```bash
WAVE_API_KEY=… WAVE_WEBHOOK_SECRET=… DATABASE_URL=… APP_URL=https://TON-DOMAINE node server.js
```

### Coupons & espace admin

- **Coupon `CADEAU200`** pré-créé : fixe le prix à **200 FCFA** (parfait pour un vrai test de
  paiement à petit coût). Saisis-le dans le champ « Code promo » de l'écran de paiement.
- **Calcul du prix côté serveur** (`lib/coupons.js` + `checkout`) : le client ne peut jamais
  imposer un montant ; le coupon est revérifié et appliqué par le serveur avant de créer la
  session Wave. Un coupon à 100 % (ou prix fixe 0) inscrit gratuitement, sans Wave.
- **Espace admin** (Profil → « Espace admin », ou `/#admin`) : créer/activer/supprimer des
  coupons. Trois types : **prix fixe (FCFA)**, **réduction en %**, **réduction d'un montant**.
  Protégé par la variable d'environnement **`ADMIN_PASSWORD`** (à définir sur Vercel). Sans
  elle, l'espace admin en ligne est désactivé ; en mode démo il fonctionne en local.
- Endpoints : `POST /api/coupon` (aperçu public) · `GET|POST /api/admin/coupons`
  (en-tête `x-admin-key`). Table Neon `coupons` créée et pré-remplie automatiquement.

### Tester sans argent réel

- `node test-wave.js` : faux serveur Wave local + parcours navigateur complet (checkout →
  redirection → webhook **signé** → reçu → accès au cours). 9 vérifications.
- `node test-coupon.js` : valide les coupons (aperçu, checkout à montant serveur, admin).
- `node test-store-neon.js` : valide la couche Neon (mapping des colonnes, `update`,
  persistance) avec un driver simulé, sans vraie base.

## Réglages avant le test grandeur nature

- Dans `index.html`, en haut du script, l'objet `CONFIG` :
  - `appUrl` : le lien partagé par « Inviter un ami sur WhatsApp » (par défaut, l'URL courante) ;
  - `whatsappSupport` : ton numéro WhatsApp (ex. `2250700000000`, sans `+`) pour afficher « Aide & donner mon avis » dans Profil.
- **Vidéos YouTube** : les identifiants proviennent d'une recherche récente — ouvre chaque leçon vidéo et vérifie que la vidéo te convient ; remplace l'identifiant dans `COURSES` sinon (4e élément de la leçon).

## Choix issus de la recherche

- **Tally / Typeform** : le format « une question à la fois » avec progression visible améliore le taux de complétion des formulaires — appliqué à l'inscription.
- **Skool** : cours + communauté + gamification légère au même endroit, interface volontairement minimale — appliqué à la structure à 4 onglets (Cours · Communauté · Mes cours · Profil).
- **Mobile money** : rail de paiement principal en Afrique de l'Ouest ; le parcours reproduit les codes connus des utilisateurs (choix opérateur → numéro → confirmation par code secret → reçu).

## Design

- Palette « papier & kola » : fond `#F7F5F0`, vert kola `#0C7A5B`, accent ambre `#E8A020` ; thème sombre complet dérivé des mêmes tokens.
- Typographie : serif système (Iowan/Palatino/Georgia) pour la marque et les titres, sans-serif système pour l'interface — aucun chargement de police externe.
- Zones tactiles ≥ 44 px, `aria-label` sur les contrôles, respect de `prefers-reduced-motion`, chiffres tabulaires pour les montants.

## Vers la production

Ce prototype valide le parcours. Pour la mise en production, il faudra :

1. un backend (comptes, cours, paiements) — par ex. Next.js + Postgres ou Supabase ;
2. un agrégateur mobile money (CinetPay, PayDunya, FedaPay, Paystack) avec webhooks de confirmation ;
3. l'hébergement des vidéos (Mux, Cloudflare Stream, YouTube non répertorié) ;
4. les notifications WhatsApp (API WhatsApp Business) pour les accès et rappels.

---

⚠️ **Démo 100 % fictive** : personnes, cours, paiements et messages sont des données de démonstration ; rien n'est collecté ni envoyé.
