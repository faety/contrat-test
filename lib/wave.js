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

/* Abonnements (Echo) — Wave ne prélève PAS automatiquement : chaque paiement
   ouvre une période d'accès datée, prolongeable manuellement par l'utilisateur.
   Le prix est TOUJOURS recalculé ici (promo comprise), jamais pris du client. */
const SUB_PLANS = {
  'echo-m': { course: 'echo', days: 31, price: 2000, label: 'Abonnement mensuel (31 jours)' },
  'echo-y': { course: 'echo', days: 366, price: 20000, label: 'Abonnement annuel (12 mois)',
              promoPrice: 10000, promoEnds: Date.UTC(2026, 7, 5, 11, 59, 59) },   // 5 août 2026, 11h59 GMT (heure d'Abidjan)
};
/* Cours accessibles UNIQUEMENT par abonnement (jamais par inscription gratuite). */
const SUB_COURSES = { echo: true };
/* PÉRIODE GRATUITE Echo : en attendant l'autorisation de droits d'auteur
   (contenus © Intellectual Reserve, Inc.), Echo est offert aux membres
   connectés. Pour revenir au modèle par abonnement : ECHO_FREE=0 en variable
   d'environnement (ou changer le défaut ici), + les deux drapeaux client
   (index.html ECHO_FREE, echo/index.html FREE). Les abonnés déjà payés
   conservent leurs jours (expiresAt intact). */
const ECHO_FREE = (process.env.ECHO_FREE || '1') === '1';
function planPrice(plan, now) { const t = now || Date.now(); return (plan.promoPrice && t <= plan.promoEnds) ? plan.promoPrice : plan.price; }
const COURSE_NAMES = {
  ia: "Comprendre l'IA en 30 minutes",
  chatgpt: 'ChatGPT au travail : gagner du temps chaque jour',
  claude: 'Maîtriser Claude pour le travail',
  copilot: "Copilot au travail : l'IA dans Word, Excel et Outlook",
  en: 'Anglais : bien démarrer (les vraies bases)',
  pack: 'Pack IA complet — ChatGPT + Claude + Copilot',
  echo: "Echo — L'anglais par le shadowing",
  'echo-m': 'Echo (shadowing) — abonnement mensuel',
  'echo-y': 'Echo (shadowing) — abonnement annuel',
  'echo-n1': 'Echo — Certificat Niveau 1 (3 leçons de shadowing)',
  'echo-n2': 'Echo — Certificat Niveau 2 (6 leçons de shadowing)',
  'echo-n3': 'Echo — Certificat Niveau 3 (10 leçons de shadowing)',
};
const isCourse = id => Object.prototype.hasOwnProperty.call(COURSE_NAMES, id);
/* Nombre de leçons par cours — sert à valider la complétion côté serveur (certificats).
   Vérifié par test contre le contenu réel d'index.html. */
const COURSE_LESSONS = { ia: 6, chatgpt: 20, claude: 18, copilot: 17, en: 7 };

/* Echo : nombre de parties par leçon (clé = id de leçon dans echo/data.js).
   Une leçon est « terminée » quand toutes ses parties (lNpM) sont validées.
   Vérifié par test contre echo/data.js. */
const ECHO_LESSONS = { l1: 8, l2: 11, l3: 15, l4: 16, l5: 14, l6: 3 };
/* Certificats Echo par paliers : Niveau N acquis à vie dès `lessons` leçons terminées. */
const ECHO_CERT_LEVELS = [
  { level: 1, lessons: 3 },
  { level: 2, lessons: 6 },
  { level: 3, lessons: 10 },
];

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

module.exports = { PRICES, PACK_COURSES, SUB_PLANS, SUB_COURSES, ECHO_FREE, planPrice, COURSE_NAMES, COURSE_LESSONS, ECHO_LESSONS, ECHO_CERT_LEVELS, isCourse, isLive, verifyWaveSignature, createSession, findByReference, getSession, sessionPaid, sessionExpired };
