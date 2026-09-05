# Gabarits d'endpoints Wave (Node, sans framework)

Quatre routes suffisent. Les handlers sont écrits « purs »
(`(input) → { status, body }`) pour être partagés entre un serveur local
(`http.createServer`) et des fonctions serverless (Vercel `api/*`).

## 1. POST /api/checkout — créer commande + session Wave

```js
const crypto = require('crypto');
const wave = require('./wave');
const store = require('./store'); // votre persistance : create/get/update de commandes

async function checkout(input, baseUrl) {
  const p = wave.payable(String((input && input.courseId) || input.productId || ''));
  if (!p) return { status: 400, body: { error: 'produit-inconnu' } };
  if (!wave.isLive()) return { status: 503, body: { error: 'demo', message: 'Paiement réel non configuré (WAVE_API_KEY absent).' } };
  if (!input.email) return { status: 400, body: { error: 'profil-incomplet' } };

  // Montant TOUJOURS recalculé ici (promo/coupon compris), jamais pris du client.
  const amount = p.price; // + logique coupon éventuelle, validée serveur

  const ref = 'KL-' + crypto.randomBytes(6).toString('hex').toUpperCase();
  const order = { ref, productId: p.id, amount, status: 'pending', buyer: { email: String(input.email).slice(0, 120) /* + nom, téléphone */ } };

  const session = await wave.createSession(order, baseUrl);
  order.waveSessionId = session.id;
  await store.create(order);
  return { status: 200, body: { ref, amount, wave_launch_url: session.wave_launch_url } };
}
```

Côté client : `location.href = wave_launch_url`.

## 2. POST /api/wave/webhook — confirmation signée

**Lire le corps BRUT** (pas de body-parser sur cette route).

```js
async function webhook(rawBody, signatureHeader) {
  if (!wave.verifyWaveSignature(signatureHeader, rawBody)) {
    return { status: 400, body: { error: 'signature' } };
  }
  let evt; try { evt = JSON.parse(rawBody); } catch (e) { return { status: 400, body: { error: 'json' } }; }
  const data = evt.data || {};
  const ref = data.client_reference;
  const o = ref && await store.get(ref);
  if (o && o.status !== 'paid' && (data.payment_status === 'succeeded' || data.checkout_status === 'complete')) {
    o.status = 'paid'; o.txId = data.transaction_id || null;
    await store.update(o);
    await afterPaid(o);            // livraison IDEMPOTENTE (voir §5)
  }
  return { status: 200, body: { ok: true } }; // toujours 200 si signature valide
}
```

Vercel : exporter `config = { api: { bodyParser: false } }` et lire le flux
(`for await (const c of req) raw += c`).

## 3. GET /api/order?ref=... — statut + RÉCONCILIATION

Appelée par le client au retour de Wave (polling quelques secondes) et par un
bouton « J'ai payé, vérifier ». Si la commande est `pending`, on interroge
Wave directement — c'est le filet de sécurité quand le webhook se perd.

```js
async function order(ref) {
  const o = await store.get(ref);
  if (!o) return { status: 404, body: { error: 'inconnu' } };
  if (o.status === 'pending' && wave.isLive()) {
    const s = (o.waveSessionId && await wave.getSession(o.waveSessionId)) || await wave.findByReference(ref);
    if (wave.sessionPaid(s)) { o.status = 'paid'; await store.update(o); await afterPaid(o); }
    else if (wave.sessionExpired(s)) { o.status = 'expired'; await store.update(o); }
  }
  return { status: 200, body: { ref: o.ref, status: o.status, productId: o.productId, amount: o.amount } };
}
```

## 4. POST /api/coupon (optionnel) — prévisualisation

Le coupon n'est qu'un AFFICHAGE côté client ; le montant final est recalculé
au checkout. Table de coupons côté serveur (code → %), jamais dans le client.

## 5. afterPaid(order) — livraison IDEMPOTENTE (le point critique)

Le même ordre peut être confirmé PLUSIEURS fois (webhook + réconciliation,
webhook rejoué). La livraison doit être un no-op au 2e passage :

```js
async function afterPaid(o) {
  try {
    const user = await store.userByEmail(o.buyer.email) || await store.userCreate(o.buyer);

    const plan = wave.SUB_PLANS[o.productId];
    if (plan) {
      const cur = await store.accessGet(user.id, plan.product);
      if (cur && cur.orderRef === o.ref) return;          // ← idempotence par référence
      // Renouvellement ADDITIF : payer en avance ne perd jamais de jours.
      const base = Math.max(Date.now(), (cur && cur.expiresAt) || 0);
      await store.accessSet(user.id, plan.product, { orderRef: o.ref, expiresAt: base + plan.days * 86400e3 });
      return;
    }
    await store.unlock(user.id, o.productId, { orderRef: o.ref }); // upsert idempotent
    // + reçu e-mail (référence, produit, montant), notification de vente…
  } catch (e) { /* la livraison ne doit JAMAIS faire échouer le webhook */ }
}
```

Si le client garde aussi un état local (localStorage), appliquer la MÊME
garde par référence côté client : `if (state.access && state.access.ref ===
ref) return;` — sinon le retour de Wave + le polling créditent deux fois.

## Côté client (rappels)

- Écran de paiement : afficher le montant renvoyé par `/api/checkout`
  (promo déduite), avec l'ancien prix barré le cas échéant.
- Au retour (`?wave=success&ref=...`) : poller `/api/order` (ex. 6 × 2 s)
  avant d'afficher le succès ; sinon proposer « Vérifier mon paiement ».
- Abonnements : afficher clairement « paiement unique, aucun prélèvement
  automatique ; renouveler ajoute les jours à votre échéance ».
