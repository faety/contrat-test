# Kalan — cours en ligne & communauté (mobile first)

> **Kalan** signifie « apprendre » en bambara.

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
  - **Mode réel** : servi par `server.js` avec une clé API Wave → bouton « Payer avec Wave » → redirection vers l'app Wave (`wave_launch_url`) → retour dans Kalan → confirmation (webhook signé + réconciliation) → reçu avec l'identifiant de transaction Wave.
  - **Mode démo** (fichier ouvert sans serveur, ou serveur sans clé) : simulation locale, clairement indiquée.
- **Espace d'apprentissage** : leçons par module, « marquer comme terminée », progression par cours.
- **Communauté** (inspirée de Skool) : fil avec catégories (Général, Entraide, Victoires, Annonces), publications, j'aime, commentaires, classement par points (+10 leçon terminée, +5 publication, +2 commentaire).
- **Profil** : informations, points, thème clair/sombre/auto, réinitialisation de la démo.

## Paiement réel avec Wave Côte d'Ivoire

Architecture : `index.html` (front) + `server.js` (Node ≥ 18, **zéro dépendance**) qui sert
l'app et parle à l'API Wave. La clé API ne quitte jamais le serveur ; le **montant est
fixé côté serveur** (`PRICES` dans `server.js`, à garder en cohérence avec `COURSES`).

1. **Obtenir les accès Wave Business** : compte marchand sur business.wave.com → créer une
   **clé API** (`wave_ci_prod_…`) → créer un **webhook** pointant vers
   `https://TON-DOMAINE/api/wave/webhook` et noter le **secret**.
2. **Déployer** (Render, Railway, VPS… — il faut une URL publique en HTTPS pour le webhook) :
   ```bash
   WAVE_API_KEY=wave_ci_prod_xxx \
   WAVE_WEBHOOK_SECRET=xxx \
   APP_URL=https://TON-DOMAINE \
   node server.js
   ```
   Sans `WAVE_API_KEY`, le serveur démarre en mode démo (paiement simulé).
3. **Circuit d'un paiement** : `POST /api/checkout` (crée la session Wave, `currency: XOF`,
   `client_reference` = référence de commande) → redirection vers `wave_launch_url` →
   l'utilisateur paie dans Wave → Wave appelle le webhook (`checkout.session.completed`,
   signature `Wave-Signature` vérifiée en HMAC-SHA256 avec tolérance 5 min) → au retour,
   le front sonde `GET /api/order?ref=…` (avec réconciliation directe auprès de Wave si le
   webhook tarde) → accès au cours débloqué + reçu.
4. **Commandes** : persistées dans `data/orders.json` (suffisant pour le test ; base de
   données réelle recommandée ensuite).
5. **Tester sans argent réel** : `node test-wave.js` (dans les fichiers de test) lance un
   faux serveur Wave local et rejoue tout le circuit, y compris la signature du webhook.

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
