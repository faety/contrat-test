---
name: wave-payments
description: >
  Intégrer les paiements Wave (Checkout API, Côte d'Ivoire / Sénégal) dans une
  webapp : produits à prix serveur, session de paiement, webhook signé,
  réconciliation, idempotence, abonnements sans prélèvement automatique,
  coupons, mode démo et banc de test complet. Utiliser ce skill dès que le
  projet doit encaisser via Wave (paiement mobile, FCFA/XOF), ajouter un
  produit payant, déboguer un webhook Wave ou écrire les tests de paiement.
---

# Paiements Wave — intégration éprouvée

Patron d'intégration complet de l'API Wave Checkout, extrait d'une application
en production (boyiainstitute.com). Tout ce qui suit a été testé en conditions
réelles, y compris les pièges (double crédit, webhooks perdus, produits hors
catalogue). Docs officielles : https://docs.wave.com/checkout et
https://docs.wave.com/webhook

## Architecture (à respecter dans l'ordre)

1. **Les prix vivent CÔTÉ SERVEUR, jamais côté client.** Le client envoie un
   identifiant de produit ; le serveur calcule le montant (promo et coupon
   compris). Ne jamais faire confiance à un montant venu du navigateur.
2. **Créer la commande AVANT la session Wave** : référence unique
   (`'KL-' + crypto.randomBytes(6).toString('hex').toUpperCase()`), statut
   `pending`, acheteur, montant. La référence part chez Wave en
   `client_reference` — c'est la clé de voûte de toute la suite.
3. **Créer la session Wave** (`POST /v1/checkout/sessions`) puis rediriger le
   client vers `wave_launch_url`. Montant en **chaîne, sans décimales** (XOF).
4. **Confirmer par DEUX canaux indépendants** :
   - le **webhook signé** (canal principal) ;
   - la **réconciliation** au retour du client (`success_url`) et sur demande
     (`GET /api/order?ref=...` qui interroge Wave si la commande est encore
     `pending`). Un webhook PEUT se perdre — la réconciliation est
     obligatoire, pas optionnelle.
5. **Livrer de façon IDEMPOTENTE** : le même ordre confirmé deux fois (webhook
   + réconciliation, ou double webhook) ne doit livrer qu'une fois. Vérifier
   `orderRef` déjà crédité côté serveur ET côté client. (Bug réel corrigé :
   un abonnement crédité deux fois = 732 jours au lieu de 366.)

Le module prêt à copier est dans `references/wave.js` ; les gabarits
d'endpoints (checkout, webhook, order, coupon) dans
`references/endpoints.md`.

## Webhook : vérification de signature (le point le plus piégeux)

- En-tête `Wave-Signature: t=<unix>,v1=<hmac>[,v1=...]`.
- Attendu : `HMAC-SHA256("${t}.${corpsBRUT}", WAVE_WEBHOOK_SECRET)` en hex.
- Il faut le **corps BRUT** (la chaîne exacte reçue), pas le JSON reparsé —
  sur Vercel/Express, désactiver le body-parser sur cette route ou lire le
  flux soi-même.
- Tolérance d'horodatage : 5 minutes. Comparaison en temps constant
  (`crypto.timingSafeEqual`) après vérification des longueurs.
- Sans `WAVE_WEBHOOK_SECRET` configuré : rejeter les webhooks (400) et
  laisser la réconciliation faire le travail — ne jamais accepter un webhook
  non vérifié.

## Abonnements : Wave NE prélève PAS automatiquement

Il n'y a pas d'auto-débit chez Wave. Le seul modèle honnête :
- chaque paiement ouvre une **période d'accès datée** (`expiresAt`) ;
- renouveler **ADDITIONNE** : nouvelle échéance =
  `max(maintenant, échéance actuelle) + durée du plan` — payer en avance ne
  fait jamais perdre de jours ;
- l'utilisateur choisit librement de prolonger (relance par e-mail/notification,
  jamais de prélèvement caché) ;
- l'écrire noir sur blanc dans l'interface (« paiement unique, aucun
  prélèvement automatique ») : c'est un argument de confiance, pas une
  faiblesse.

## Mode démo et variables d'environnement

- `WAVE_API_KEY` absent ⇒ **mode démo** : le flux de paiement est simulé en
  local (aucun appel réseau), parfait pour développer et pour les tests UI.
- Variables : `WAVE_API_KEY`, `WAVE_WEBHOOK_SECRET`, et `WAVE_API_BASE`
  (surcharge de `https://api.wave.com`, indispensable pour le banc de test).
- **Jamais de secret dans le dépôt** : uniquement dans les variables
  d'environnement de l'hébergeur (Vercel, etc.).
- L'URL du webhook à coller dans le tableau de bord Wave :
  `https://<domaine>/api/wave/webhook`.

## Tests : banc Wave complet sans toucher au vrai Wave

`references/test-wave-stub.js` fournit un **faux serveur Wave** local :
création de session, page `/pay` qui déclenche un **webhook signé** vers
l'app, endpoint de recherche pour la réconciliation. Avec
`WAVE_API_BASE=http://127.0.0.1:<port>`, on rejoue le parcours RÉEL de bout
en bout (session → paiement → webhook → livraison) dans un test automatisé.
Toujours tester : le parcours nominal, l'idempotence (rejouer le même
webhook), la signature invalide (400), et la réconciliation sans webhook.

## Pièges vécus (à vérifier systématiquement)

- **Produits hors catalogue** : si l'app a plusieurs familles de produits
  (cours, packs, plans), centraliser la résolution dans une fonction
  `payable(id)` et **garder l'erreur explicite** si `undefined` — un
  `c.id` sur `undefined` avant le `fetch` s'affiche comme une fausse « erreur
  de connexion » impossible à déboguer.
- **Affichage du prix promo** : l'en-tête de l'écran de paiement doit montrer
  le montant réellement calculé par le serveur (promo/coupon déduit), pas le
  prix catalogue.
- **Coupons** : validation et calcul côté serveur uniquement ; un endpoint de
  prévisualisation (`POST /api/coupon`) pour l'affichage ; jamais de coupon
  sur les plans d'abonnement sans décision explicite.
- **Réseau lent (marché FCFA = mobile)** : après le retour de Wave, POLLER
  `GET /api/order?ref=...` quelques secondes plutôt que de supposer le
  webhook déjà arrivé ; prévoir un bouton « J'ai payé, vérifier ».
- Reçu par e-mail à chaque paiement (référence, produit, montant) : les
  litiges se règlent avec la référence de commande.

## Liste de mise en production

`references/checklist.md` — env vars posées, webhook enregistré chez Wave,
test à 100 F réel, idempotence vérifiée, secrets absents du dépôt, mentions
de transparence affichées.
