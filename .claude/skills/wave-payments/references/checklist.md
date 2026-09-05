# Liste de contrôle — mise en production d'un paiement Wave

## Avant d'écrire du code
- [ ] Compte Wave Business validé, accès au tableau de bord développeur.
- [ ] Catalogue défini CÔTÉ SERVEUR (`PRODUCTS` / `SUB_PLANS`), prix en XOF
      entiers. Si abonnement : durée en jours + texte de transparence prêt
      (« paiement unique, aucun prélèvement automatique »).

## Configuration (jamais dans le dépôt)
- [ ] `WAVE_API_KEY` posée dans les variables d'environnement de l'hébergeur.
- [ ] `WAVE_WEBHOOK_SECRET` posée (fournie par Wave à la création du webhook).
- [ ] URL du webhook enregistrée chez Wave : `https://<domaine>/api/wave/webhook`.
- [ ] `git grep` des secrets avant chaque commit : aucun résultat.

## Serveur
- [ ] Montants recalculés serveur (promo/coupon compris) ; le client n'envoie
      qu'un identifiant de produit.
- [ ] Commande créée `pending` AVANT `createSession`, avec `ref` unique et
      `waveSessionId` stocké.
- [ ] Webhook : corps BRUT, signature vérifiée (HMAC t.corps, ±5 min,
      timingSafeEqual), 400 sinon.
- [ ] Réconciliation dans `GET /api/order` (getSession par id, sinon
      recherche par référence).
- [ ] `afterPaid` IDEMPOTENT par `orderRef` (webhook rejoué = no-op) et qui
      n'échoue jamais (try/catch — ne jamais faire échouer le webhook).
- [ ] Abonnement : échéance = `max(maintenant, échéance) + jours` (additif).

## Client
- [ ] Redirection `wave_launch_url` ; au retour, polling de `/api/order`
      avant d'afficher le succès + bouton « Vérifier mon paiement ».
- [ ] Montant affiché = montant serveur (promo déduite, ancien prix barré).
- [ ] Si état local (localStorage) : même garde d'idempotence par `ref`.
- [ ] Reçu e-mail avec la référence de commande.

## Tests (banc `test-wave-stub.js`)
- [ ] Parcours nominal de bout en bout (session → webhook signé → livraison).
- [ ] Webhook rejoué → pas de double livraison (vérifier les jours/produits).
- [ ] Signature invalide → 400, commande intacte.
- [ ] Réconciliation seule (webhook « perdu ») → commande passe `paid`.
- [ ] Produit inconnu au checkout → 400 explicite (pas de plantage).

## Après mise en ligne
- [ ] Un paiement RÉEL de petit montant (ex. 100 F) de bout en bout :
      webhook reçu, commande `paid`, produit livré, reçu envoyé.
- [ ] Vérifier les logs du webhook sur le premier vrai paiement client.
- [ ] Coupon de test (ex. −100 %) jamais communiqué publiquement.
