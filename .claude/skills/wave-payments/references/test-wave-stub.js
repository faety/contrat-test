/*
  Banc de test Wave : FAUX serveur Wave local qui reproduit le parcours réel
  (création de session → « paiement » → WEBHOOK SIGNÉ → réconciliation).
  Lancer l'app avec WAVE_API_BASE=http://127.0.0.1:<WAVE_PORT> et une fausse
  clé/secret, et le vrai code de production s'exécute de bout en bout.

  Squelette à adapter : remplacer APP_PORT / la vérification finale.
*/
'use strict';
const http = require('http');
const crypto = require('crypto');

const WAVE_PORT = 4342;
const APP_URL = process.env.APP_URL || 'http://127.0.0.1:4341';
const SECRET = 'whsec_test';   // = WAVE_WEBHOOK_SECRET passé à l'app testée

const signBody = b => {
  const t = Math.floor(Date.now() / 1000);
  return `t=${t},v1=${crypto.createHmac('sha256', SECRET).update(`${t}.${b}`).digest('hex')}`;
};

const sessions = {};
const waveStub = http.createServer((req, res) => {
  let data = ''; req.on('data', c => data += c); req.on('end', async () => {
    const url = new URL(req.url, 'http://x');

    /* Création de session (ce que l'app appelle via createSession). */
    if (req.method === 'POST' && url.pathname === '/v1/checkout/sessions') {
      const p = JSON.parse(data); const id = 'cos-' + crypto.randomBytes(5).toString('hex');
      sessions[p.client_reference] = { id, ...p, checkout_status: 'open', payment_status: 'processing' };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ id, wave_launch_url: `http://127.0.0.1:${WAVE_PORT}/pay?ref=${p.client_reference}` }));
    }

    /* « Page de paiement » : marque payé, ENVOIE LE WEBHOOK SIGNÉ à l'app,
       puis redirige vers success_url — exactement comme le vrai Wave. */
    if (req.method === 'GET' && url.pathname === '/pay') {
      const ref = url.searchParams.get('ref'); const s = sessions[ref];
      s.checkout_status = 'complete'; s.payment_status = 'succeeded'; s.transaction_id = 'TX-' + ref.slice(-4);
      const body = JSON.stringify({ id: 'evt-1', type: 'checkout.session.completed',
        data: { id: s.id, client_reference: ref, transaction_id: s.transaction_id, payment_status: 'succeeded', checkout_status: 'complete' } });
      await fetch(`${APP_URL}/api/wave/webhook`, { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Wave-Signature': signBody(body) }, body });
      res.writeHead(302, { Location: s.success_url }); return res.end();
    }

    /* Recherche par référence (réconciliation findByReference). */
    if (req.method === 'GET' && url.pathname === '/v1/checkout/sessions/search') {
      const ref = url.searchParams.get('client_reference');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ result: sessions[ref] ? [sessions[ref]] : [] }));
    }

    /* Session par id (réconciliation getSession). */
    const m = /^\/v1\/checkout\/sessions\/(.+)$/.exec(url.pathname);
    if (req.method === 'GET' && m) {
      const s = Object.values(sessions).find(x => x.id === decodeURIComponent(m[1]));
      res.writeHead(s ? 200 : 404, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(s || {}));
    }

    res.writeHead(404); res.end();
  });
});

/* Cas à couvrir dans les tests qui utilisent ce banc :
   1. Parcours nominal : checkout → /pay → webhook → commande 'paid', produit livré.
   2. IDEMPOTENCE : rejouer le même webhook (re-fetch avec le même corps signé)
      → aucune double livraison (jours d'abonnement inchangés).
   3. Signature invalide : webhook avec 'Wave-Signature: t=...,v1=deadbeef' → 400,
      commande toujours 'pending'.
   4. Réconciliation sans webhook : ne PAS appeler /pay ; marquer la session
      payée à la main dans `sessions`, puis GET /api/order?ref=... → 'paid'.
   Lancer l'app testée en sous-processus avec :
     { WAVE_API_KEY: 'wave_ci_test', WAVE_WEBHOOK_SECRET: SECRET,
       WAVE_API_BASE: `http://127.0.0.1:${WAVE_PORT}`, APP_URL } */

module.exports = { waveStub, WAVE_PORT, SECRET, sessions, signBody };
if (require.main === module) waveStub.listen(WAVE_PORT, () => console.log('Faux Wave sur :' + WAVE_PORT));
