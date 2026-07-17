/*
  Logique Wave (API Checkout Côte d'Ivoire) — partagée entre le serveur local
  (server.js) et les fonctions Vercel (api/*). Aucune dépendance externe.
  Doc : https://docs.wave.com/checkout · https://docs.wave.com/webhook
*/
'use strict';
const crypto = require('crypto');

const WAVE_API_KEY = process.env.WAVE_API_KEY || '';
const WAVE_WEBHOOK_SECRET = process.env.WAVE_WEBHOOK_SECRET || '';
const WAVE_API_BASE = (process.env.WAVE_API_BASE || 'https://api.wave.com').replace(/\/$/, '');

/* Prix officiels en FCFA — source de vérité côté serveur (jamais le client).
   Garder en cohérence avec le tableau COURSES de index.html. */
/* `pack` = bundle : les 3 cours IA payants en un seul achat (économie affichée au client). */
const PRICES = { chatgpt: 5000, claude: 5000, copilot: 5000, pack: 12000 };
const PACK_COURSES = ['chatgpt', 'claude', 'copilot'];
const COURSE_NAMES = {
  ia: "Comprendre l'IA en 30 minutes",
  chatgpt: 'ChatGPT au travail : gagner du temps chaque jour',
  claude: 'Maîtriser Claude pour le travail',
  copilot: "Copilot au travail : l'IA dans Word, Excel et Outlook",
  en: 'Anglais : bien démarrer (les vraies bases)',
  pack: 'Pack IA complet — ChatGPT + Claude + Copilot',
};
const isCourse = id => Object.prototype.hasOwnProperty.call(COURSE_NAMES, id);
/* Nombre de leçons par cours — sert à valider la complétion côté serveur (certificats).
   Vérifié par test contre le contenu réel d'index.html. */
const COURSE_LESSONS = { ia: 6, chatgpt: 20, claude: 18, copilot: 17, en: 7 };

const isLive = () => !!WAVE_API_KEY;

/* Vérification de signature webhook Wave.
   En-tête : Wave-Signature: t=<unix>,v1=<hmac>[,v1=<hmac>...]
   Attendu : HMAC-SHA256(`${t}.${corpsBrut}`, secret) en hex ; tolérance 5 min. */
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

async function createSession(order, baseUrl) {
  const res = await fetch(`${WAVE_API_BASE}/v1/checkout/sessions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${WAVE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: String(order.amount),            // XOF : pas de décimales
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

async function findByReference(ref) {
  const res = await fetch(`${WAVE_API_BASE}/v1/checkout/sessions/search?client_reference=${encodeURIComponent(ref)}`, {
    headers: { 'Authorization': `Bearer ${WAVE_API_KEY}` },
  });
  if (!res.ok) return null;
  const body = await res.json().catch(() => null);
  const list = Array.isArray(body) ? body : (body && (body.result || body.results || body.data || body.items)) || [];
  return (Array.isArray(list) ? list[0] : list) || null;
}

/* Récupère une session par son id (endpoint canonique, plus fiable que la recherche). */
async function getSession(id) {
  if (!id) return null;
  const res = await fetch(`${WAVE_API_BASE}/v1/checkout/sessions/${encodeURIComponent(id)}`, {
    headers: { 'Authorization': `Bearer ${WAVE_API_KEY}` },
  });
  if (!res.ok) return null;
  return await res.json().catch(() => null);
}

/* Une session Wave est-elle payée ? (tolérant sur les variantes de champs) */
function sessionPaid(s) {
  if (!s) return false;
  return s.payment_status === 'succeeded' || s.checkout_status === 'complete' || s.status === 'complete';
}
function sessionExpired(s) {
  return s && (s.checkout_status === 'expired' || s.status === 'expired') && s.payment_status !== 'succeeded';
}

module.exports = { PRICES, PACK_COURSES, COURSE_NAMES, COURSE_LESSONS, isCourse, isLive, verifyWaveSignature, createSession, findByReference, getSession, sessionPaid, sessionExpired };
