/*
  Logique métier des endpoints, indépendante du framework (Node http OU fonctions Vercel).
  Chaque fonction retourne { status, body }. Les adaptateurs (server.js, api/*) ne font que
  brancher req/res dessus.
*/
'use strict';
const crypto = require('crypto');
const wave = require('./wave');
const store = require('./store');
const coupons = require('./coupons');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

async function health() {
  return { status: 200, body: { ok: true, wave: wave.isLive(), demo: !wave.isLive(), store: store.kind, admin: !!ADMIN_PASSWORD } };
}

/* Résout un coupon actif pour un cours et calcule le prix final. */
async function resolveCoupon(courseId, code) {
  const base = wave.PRICES[courseId];
  if (!base) return null;
  const c = code ? await store.couponGet(code) : null;
  const res = coupons.computeAmount(base, c && c.active ? c : null);
  return { base, coupon: c && c.active ? c : null, ...res };
}

/* Prévisualisation d'un coupon (public) — pour afficher le prix réduit avant de payer. */
async function couponPreview(input) {
  const base = wave.PRICES[input && input.courseId];
  if (!base) return { status: 400, body: { error: 'cours-inconnu' } };
  const code = coupons.normCode(input.code);
  const c = await store.couponGet(code);
  if (!c || !c.active) return { status: 200, body: { valid: false, original: base } };
  const r = coupons.computeAmount(base, c);
  return { status: 200, body: { valid: true, code: c.code, original: base, amount: r.amount, free: r.free, label: c.label || coupons.couponSummary(c), summary: coupons.couponSummary(c) } };
}

async function checkout(input, baseUrl) {
  if (!wave.isLive()) return { status: 503, body: { error: 'demo', message: 'Paiement réel non configuré (WAVE_API_KEY absent).' } };
  const base = wave.PRICES[input && input.courseId];
  if (!base) return { status: 400, body: { error: 'cours-inconnu' } };
  if (!input.prenom || !input.nom || !input.whatsapp || !input.email) return { status: 400, body: { error: 'profil-incomplet' } };

  /* Montant recalculé côté serveur à partir du coupon (jamais celui du client). */
  const resolved = await resolveCoupon(input.courseId, input.code);
  const amount = resolved.amount;
  const couponCode = resolved.coupon ? resolved.coupon.code : null;

  const ref = 'KL-' + crypto.randomBytes(6).toString('hex').toUpperCase();
  const order = {
    ref, courseId: input.courseId, amount, status: 'pending', coupon: couponCode,
    buyer: {
      prenom: String(input.prenom).slice(0, 60), nom: String(input.nom).slice(0, 60),
      whatsapp: String(input.whatsapp).slice(0, 24), email: String(input.email).slice(0, 120),
    },
  };

  /* Coupon qui rend le cours gratuit : on inscrit directement, sans passer par Wave. */
  if (resolved.free) {
    order.status = 'paid'; order.amount = 0;
    await store.create(order);
    if (couponCode) await store.couponBump(couponCode);
    return { status: 200, body: { ref, free: true, courseId: input.courseId, amount: 0 } };
  }

  const session = await wave.createSession(order, baseUrl);
  order.waveSessionId = session.id;
  await store.create(order);
  if (couponCode) await store.couponBump(couponCode);
  return { status: 200, body: { ref, amount, wave_launch_url: session.wave_launch_url } };
}

/* ---- Administration des coupons (protégée par ADMIN_PASSWORD) ---- */
function adminAuthOK(key) {
  if (!ADMIN_PASSWORD || !key) return false;
  const a = Buffer.from(String(key)); const b = Buffer.from(ADMIN_PASSWORD);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function adminCoupons(method, body, adminKey) {
  if (!ADMIN_PASSWORD) return { status: 503, body: { error: 'admin-non-configure', message: "Définis la variable d'environnement ADMIN_PASSWORD pour activer l'espace admin." } };
  if (!adminAuthOK(adminKey)) return { status: 401, body: { error: 'non-autorise' } };
  if (method === 'GET') {
    return { status: 200, body: { coupons: await store.couponList() } };
  }
  const action = body && body.action;
  if (action === 'save') {
    const v = coupons.validateCoupon(body.coupon || {});
    if (!v.ok) return { status: 400, body: { error: 'invalide', message: v.error } };
    await store.couponSave(v.coupon);
    return { status: 200, body: { ok: true, coupons: await store.couponList() } };
  }
  if (action === 'delete') {
    await store.couponDelete(body.code);
    return { status: 200, body: { ok: true, coupons: await store.couponList() } };
  }
  return { status: 400, body: { error: 'action-inconnue' } };
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

module.exports = { health, checkout, couponPreview, adminCoupons, webhook, order, readRawBody, baseUrlFrom };
