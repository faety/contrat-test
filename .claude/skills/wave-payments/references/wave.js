/*
  Module Wave (API Checkout) — générique, sans dépendance externe, prêt à
  copier dans lib/wave.js d'un nouveau projet. Node 18+ (fetch natif).
  Adapter uniquement PRODUCTS / SUB_PLANS à votre catalogue.
  Doc : https://docs.wave.com/checkout · https://docs.wave.com/webhook
*/
'use strict';
const crypto = require('crypto');

const WAVE_API_KEY = process.env.WAVE_API_KEY || '';
const WAVE_WEBHOOK_SECRET = process.env.WAVE_WEBHOOK_SECRET || '';
const WAVE_API_BASE = (process.env.WAVE_API_BASE || 'https://api.wave.com').replace(/\/$/, '');

/* ------------------------------------------------------------------ */
/* CATALOGUE — source de vérité UNIQUE des prix, côté serveur.        */
/* Le client n'envoie qu'un identifiant ; le montant est calculé ici. */
/* ------------------------------------------------------------------ */

/* Achats uniques : id → prix en FCFA (XOF, entier, pas de décimales). */
const PRODUCTS = {
  // exemple : basic: 5000, premium: 12000,
};

/* Abonnements : Wave ne prélève PAS automatiquement. Chaque paiement ouvre
   une période d'accès datée ; renouveler ADDITIONNE les jours à l'échéance.
   promoPrice/promoEnds (Date.UTC) : promo à bascule automatique. */
const SUB_PLANS = {
  // exemple :
  // 'app-m': { product: 'app', days: 31,  price: 2000,  label: 'Abonnement mensuel (31 jours)' },
  // 'app-y': { product: 'app', days: 366, price: 20000, label: 'Abonnement annuel (12 mois)',
  //            promoPrice: 10000, promoEnds: Date.UTC(2026, 7, 5, 11, 59, 59) },
};
function planPrice(plan, now) {
  const t = now || Date.now();
  return (plan.promoPrice && t <= plan.promoEnds) ? plan.promoPrice : plan.price;
}

/* Résout N'IMPORTE quel identifiant payable (achat unique ou plan).
   Toujours passer par ici côté client ET serveur ; si undefined, afficher
   une vraie erreur — jamais laisser planter plus loin (sinon l'utilisateur
   voit une fausse « erreur de connexion »). */
function payable(id) {
  if (PRODUCTS[id] != null) return { id, kind: 'product', price: PRODUCTS[id] };
  if (SUB_PLANS[id]) return { id, kind: 'plan', ...SUB_PLANS[id], price: planPrice(SUB_PLANS[id]) };
  return null;
}

const isLive = () => !!WAVE_API_KEY;   // sans clé → mode démo (paiement simulé)

/* ------------------------------------------------------------------ */
/* Signature webhook — NE PAS MODIFIER (formule officielle Wave).     */
/* En-tête : Wave-Signature: t=<unix>,v1=<hmac>[,v1=<hmac>...]        */
/* Attendu : HMAC-SHA256(`${t}.${corpsBRUT}`, secret) hex ; ±5 min.   */
/* IMPORTANT : rawBody = chaîne brute reçue, PAS le JSON reparsé.     */
/* ------------------------------------------------------------------ */
function verifyWaveSignature(header, rawBody, secret = WAVE_WEBHOOK_SECRET) {
  if (!header || !secret) return false;
  let t = null; const sigs = [];
  for (const part of String(header).split(',')) {
    const i = part.indexOf('=');
    const k = part.slice(0, i).trim(), v = part.slice(i + 1).trim();
    if (k === 't') t = v;
    else if (k === 'v1' && v) sigs.push(v);
  }
  if (!t || sigs.length === 0) return false;
  const age = Math.abs(Date.now() / 1000 - Number(t));
  if (!Number.isFinite(age) || age > 300) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  const expBuf = Buffer.from(expected);
  return sigs.some(s => {
    const b = Buffer.from(s);
    return b.length === expBuf.length && crypto.timingSafeEqual(b, expBuf);
  });
}

/* ------------------------------------------------------------------ */
/* API Checkout                                                        */
/* ------------------------------------------------------------------ */

/* Crée la session de paiement. order = { ref, amount } déjà enregistrée
   côté serveur (statut pending) AVANT cet appel. */
async function createSession(order, baseUrl) {
  const res = await fetch(`${WAVE_API_BASE}/v1/checkout/sessions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${WAVE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: String(order.amount),            // XOF : entier, en chaîne
      currency: 'XOF',
      client_reference: order.ref,
      success_url: `${baseUrl}/?wave=success&ref=${order.ref}`,
      error_url: `${baseUrl}/?wave=error&ref=${order.ref}`,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Wave ${res.status}: ${JSON.stringify(body)}`);
  return body; // { id, wave_launch_url, checkout_status, payment_status, ... }
}

/* Réconciliation : retrouve une session par référence de commande. */
async function findByReference(ref) {
  const res = await fetch(`${WAVE_API_BASE}/v1/checkout/sessions/search?client_reference=${encodeURIComponent(ref)}`, {
    headers: { 'Authorization': `Bearer ${WAVE_API_KEY}` },
  });
  if (!res.ok) return null;
  const body = await res.json().catch(() => null);
  const list = Array.isArray(body) ? body : (body && (body.result || body.results || body.data || body.items)) || [];
  return (Array.isArray(list) ? list[0] : list) || null;
}

/* Par id de session (endpoint canonique, plus fiable que la recherche
   quand on a stocké waveSessionId sur la commande). */
async function getSession(id) {
  if (!id) return null;
  const res = await fetch(`${WAVE_API_BASE}/v1/checkout/sessions/${encodeURIComponent(id)}`, {
    headers: { 'Authorization': `Bearer ${WAVE_API_KEY}` },
  });
  if (!res.ok) return null;
  return await res.json().catch(() => null);
}

/* Tolérant aux variantes de champs renvoyées par Wave. */
function sessionPaid(s) {
  if (!s) return false;
  return s.payment_status === 'succeeded' || s.checkout_status === 'complete' || s.status === 'complete';
}
function sessionExpired(s) {
  return s && (s.checkout_status === 'expired' || s.status === 'expired') && s.payment_status !== 'succeeded';
}

module.exports = {
  PRODUCTS, SUB_PLANS, planPrice, payable, isLive,
  verifyWaveSignature, createSession, findByReference, getSession, sessionPaid, sessionExpired,
};
