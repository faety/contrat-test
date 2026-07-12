/*
  Logique métier des endpoints, indépendante du framework (Node http OU fonctions Vercel).
  Chaque fonction retourne { status, body }. Les adaptateurs (server.js, api/*) ne font que
  brancher req/res dessus.
*/
'use strict';
const crypto = require('crypto');
const wave = require('./wave');
const store = require('./store');

async function health() {
  return { status: 200, body: { ok: true, wave: wave.isLive(), demo: !wave.isLive(), store: store.kind } };
}

async function checkout(input, baseUrl) {
  if (!wave.isLive()) return { status: 503, body: { error: 'demo', message: 'Paiement réel non configuré (WAVE_API_KEY absent).' } };
  const amount = wave.PRICES[input && input.courseId];
  if (!amount) return { status: 400, body: { error: 'cours-inconnu' } };
  if (!input.prenom || !input.nom || !input.whatsapp || !input.email) return { status: 400, body: { error: 'profil-incomplet' } };

  const ref = 'KL-' + crypto.randomBytes(6).toString('hex').toUpperCase();
  const order = {
    ref, courseId: input.courseId, amount, status: 'pending',
    buyer: {
      prenom: String(input.prenom).slice(0, 60), nom: String(input.nom).slice(0, 60),
      whatsapp: String(input.whatsapp).slice(0, 24), email: String(input.email).slice(0, 120),
    },
  };
  const session = await wave.createSession(order, baseUrl);
  order.waveSessionId = session.id;
  await store.create(order);
  return { status: 200, body: { ref, wave_launch_url: session.wave_launch_url } };
}

async function webhook(rawBody, signatureHeader) {
  if (!wave.verifyWaveSignature(signatureHeader, rawBody)) {
    return { status: 400, body: { error: 'signature' } };
  }
  let evt; try { evt = JSON.parse(rawBody); } catch (e) { return { status: 400, body: { error: 'json' } }; }
  const s = evt.data || {};
  if (evt.type === 'checkout.session.completed') {
    let order = s.client_reference ? await store.get(s.client_reference) : null;
    if (!order && s.id) order = await store.findBySessionId(s.id);
    if (order && order.status !== 'paid') {
      await store.update(order.ref, { status: 'paid', transactionId: s.transaction_id || null, waveSessionId: s.id });
    }
  } else if (evt.type === 'checkout.session.payment_failed') {
    const order = s.client_reference ? await store.get(s.client_reference) : null;
    if (order && order.status === 'pending') {
      await store.update(order.ref, { status: 'failed', lastError: (s.last_payment_error && s.last_payment_error.code) || 'payment_failed' });
    }
  }
  return { status: 200, body: { received: true } };
}

async function order(ref) {
  let o = ref ? await store.get(ref) : null;
  if (!o) return { status: 404, body: { error: 'introuvable' } };
  /* Filet de sécurité : si le webhook n'est pas encore arrivé, on interroge Wave. */
  if (o.status === 'pending' && wave.isLive()) {
    try {
      const s = await wave.findByReference(ref);
      if (s && (s.payment_status === 'succeeded' || s.checkout_status === 'complete')) {
        o = await store.update(ref, { status: 'paid', transactionId: s.transaction_id || null, waveSessionId: s.id });
      } else if (s && s.checkout_status === 'expired' && s.payment_status !== 'succeeded') {
        o = await store.update(ref, { status: 'failed', lastError: 'expired' });
      }
    } catch (e) { /* réseau : on renvoie pending, le front réessaiera */ }
  }
  return {
    status: 200,
    body: {
      ref: o.ref, status: o.status, courseId: o.courseId, amount: o.amount,
      transactionId: o.transactionId || null, courseName: wave.COURSE_NAMES[o.courseId] || o.courseId,
    },
  };
}

/* Lit le corps brut d'une requête (flux) — nécessaire pour vérifier la signature. */
function readRawBody(req, limit = 256 * 1024) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > limit) { req.destroy(); reject(new Error('body trop grand')); } });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

/* Base URL publique déduite des en-têtes (fallback si APP_URL absent). */
function baseUrlFrom(req) {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

module.exports = { health, checkout, webhook, order, readRawBody, baseUrlFrom };
