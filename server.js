/*
  Kalan — serveur de paiement Wave (Côte d'Ivoire)
  Node >= 18, zéro dépendance (http, crypto, fetch natifs).

  Démarrage :
    WAVE_API_KEY=wave_ci_prod_xxx WAVE_WEBHOOK_SECRET=xxx APP_URL=https://ton-domaine node server.js

  Variables d'environnement :
    WAVE_API_KEY        clé API Wave Business (portail business.wave.com). Absente => mode démo :
                        l'app fonctionne, le paiement reste simulé côté client.
    WAVE_WEBHOOK_SECRET secret du webhook (affiché à la création du webhook dans le portail Wave).
    APP_URL             URL publique de l'app (pour success_url / error_url). Défaut: http://localhost:3000
    PORT                port d'écoute. Défaut: 3000
    WAVE_API_BASE       base de l'API Wave (surchargée uniquement par les tests). Défaut: https://api.wave.com

  Webhook à déclarer dans le portail Wave :  POST {APP_URL}/api/wave/webhook
  Doc : https://docs.wave.com/checkout · https://docs.wave.com/webhook
*/
'use strict';
const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '3000', 10);
const APP_URL = (process.env.APP_URL || `http://localhost:${PORT}`).replace(/\/$/, '');
const WAVE_API_KEY = process.env.WAVE_API_KEY || '';
const WAVE_WEBHOOK_SECRET = process.env.WAVE_WEBHOOK_SECRET || '';
const WAVE_API_BASE = (process.env.WAVE_API_BASE || 'https://api.wave.com').replace(/\/$/, '');

/* Prix officiels en FCFA — source de vérité côté serveur (jamais le client).
   Garder en cohérence avec le tableau COURSES de index.html. */
const PRICES = { chatgpt: 5000, claude: 5000, copilot: 5000 };
const COURSE_NAMES = {
  chatgpt: 'ChatGPT au travail : gagner du temps chaque jour',
  claude: 'Claude au travail : rédiger et analyser comme un pro',
  copilot: "Copilot au travail : l'IA dans Word, Excel et Outlook",
};

/* ---- Persistance simple des commandes (fichier JSON) ---- */
const DATA_DIR = path.join(__dirname, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
let orders = {};
try { orders = JSON.parse(fs.readFileSync(ORDERS_FILE, 'utf8')); } catch (e) { orders = {}; }
function saveOrders() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 1));
  } catch (e) { console.error('saveOrders:', e.message); }
}

function log(...a) { console.log(new Date().toISOString(), ...a); }

/* ---- Vérification de signature webhook Wave ----
   En-tête : Wave-Signature: t=<unix>,v1=<hmac>[,v1=<hmac>...]
   Signature attendue : HMAC-SHA256( `${t}.${corpsBrut}`, secret ) en hex.
   Tolérance de 5 minutes contre le rejeu. */
function verifyWaveSignature(header, rawBody, secret) {
  if (!header || !secret) return false;
  let t = null; const sigs = [];
  for (const part of header.split(',')) {
    const [k, v] = part.split('=').map(s => (s || '').trim());
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

/* ---- Appels API Wave ---- */
async function waveCreateSession(order) {
  const res = await fetch(`${WAVE_API_BASE}/v1/checkout/sessions`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${WAVE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: String(order.amount),          // XOF : pas de décimales
      currency: 'XOF',
      client_reference: order.ref,
      success_url: `${APP_URL}/?wave=success&ref=${order.ref}`,
      error_url: `${APP_URL}/?wave=error&ref=${order.ref}`,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Wave ${res.status}: ${JSON.stringify(body)}`);
  return body; // { id, wave_launch_url, checkout_status, payment_status, ... }
}

async function waveFindByReference(ref) {
  const res = await fetch(`${WAVE_API_BASE}/v1/checkout/sessions/search?client_reference=${encodeURIComponent(ref)}`, {
    headers: { 'Authorization': `Bearer ${WAVE_API_KEY}` },
  });
  if (!res.ok) return null;
  const body = await res.json().catch(() => null);
  const list = Array.isArray(body) ? body : (body && body.result) || [];
  return list[0] || null;
}

function markPaid(order, session) {
  if (order.status === 'paid') return;
  order.status = 'paid';
  order.paidAt = Date.now();
  if (session) {
    order.waveSessionId = session.id || order.waveSessionId;
    order.transactionId = session.transaction_id || null;
  }
  saveOrders();
  log(`✔ paiement confirmé ${order.ref} (${order.amount} XOF, ${order.courseId})`);
}

/* ---- Utilitaires HTTP ---- */
function sendJSON(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}
function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > limit) { reject(new Error('body trop grand')); req.destroy(); } });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const INDEX = path.join(__dirname, 'index.html');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    /* --- Santé / détection de mode par le front --- */
    if (req.method === 'GET' && url.pathname === '/api/health') {
      return sendJSON(res, 200, { ok: true, wave: !!WAVE_API_KEY, demo: !WAVE_API_KEY });
    }

    /* --- Créer une session de paiement Wave --- */
    if (req.method === 'POST' && url.pathname === '/api/checkout') {
      if (!WAVE_API_KEY) return sendJSON(res, 503, { error: 'demo', message: 'Paiement réel non configuré (WAVE_API_KEY absent).' });
      let p; try { p = JSON.parse(await readBody(req)); } catch (e) { return sendJSON(res, 400, { error: 'json' }); }
      const amount = PRICES[p.courseId];
      if (!amount) return sendJSON(res, 400, { error: 'cours-inconnu' });
      if (!p.prenom || !p.nom || !p.whatsapp || !p.email) return sendJSON(res, 400, { error: 'profil-incomplet' });

      const ref = 'KL-' + crypto.randomBytes(6).toString('hex').toUpperCase();
      const order = {
        ref, courseId: p.courseId, amount, status: 'pending', createdAt: Date.now(),
        buyer: { prenom: String(p.prenom).slice(0, 60), nom: String(p.nom).slice(0, 60),
                 whatsapp: String(p.whatsapp).slice(0, 24), email: String(p.email).slice(0, 120) },
      };
      const session = await waveCreateSession(order);
      order.waveSessionId = session.id;
      orders[ref] = order; saveOrders();
      log(`→ session Wave créée ${ref} (${amount} XOF, ${p.courseId})`);
      return sendJSON(res, 200, { ref, wave_launch_url: session.wave_launch_url });
    }

    /* --- Webhook Wave --- */
    if (req.method === 'POST' && url.pathname === '/api/wave/webhook') {
      const raw = await readBody(req, 256 * 1024);
      const sig = req.headers['wave-signature'];
      if (!verifyWaveSignature(sig, raw, WAVE_WEBHOOK_SECRET)) {
        log('✗ webhook: signature invalide');
        return sendJSON(res, 400, { error: 'signature' });
      }
      let evt; try { evt = JSON.parse(raw); } catch (e) { return sendJSON(res, 400, { error: 'json' }); }
      if (evt.type === 'checkout.session.completed') {
        const s = evt.data || {};
        const order = (s.client_reference && orders[s.client_reference]) ||
                      Object.values(orders).find(o => o.waveSessionId === s.id);
        if (order) markPaid(order, s);
        else log(`webhook: commande introuvable (ref=${s.client_reference}, id=${s.id})`);
      } else if (evt.type === 'checkout.session.payment_failed') {
        const s = evt.data || {};
        const order = s.client_reference && orders[s.client_reference];
        if (order && order.status === 'pending') { order.status = 'failed'; order.lastError = (s.last_payment_error && s.last_payment_error.code) || 'payment_failed'; saveOrders(); }
      }
      return sendJSON(res, 200, { received: true }); // répondre vite et 2xx
    }

    /* --- Statut d'une commande (le front sonde après le retour de Wave) --- */
    if (req.method === 'GET' && url.pathname === '/api/order') {
      const ref = url.searchParams.get('ref') || '';
      const order = orders[ref];
      if (!order) return sendJSON(res, 404, { error: 'introuvable' });
      /* Filet de sécurité : si le webhook n'est pas encore arrivé, on interroge Wave directement. */
      if (order.status === 'pending' && WAVE_API_KEY) {
        try {
          const s = await waveFindByReference(ref);
          if (s && (s.payment_status === 'succeeded' || s.checkout_status === 'complete')) markPaid(order, s);
          else if (s && s.checkout_status === 'expired' && s.payment_status !== 'succeeded') { order.status = 'failed'; order.lastError = 'expired'; saveOrders(); }
        } catch (e) { /* réseau : on renverra pending, le front réessaiera */ }
      }
      return sendJSON(res, 200, {
        ref: order.ref, status: order.status, courseId: order.courseId, amount: order.amount,
        transactionId: order.transactionId || null, courseName: COURSE_NAMES[order.courseId] || order.courseId,
      });
    }

    /* --- Fichiers statiques : l'app --- */
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      const html = fs.readFileSync(INDEX);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(html);
    }
    if (url.pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }

    sendJSON(res, 404, { error: 'not-found' });
  } catch (e) {
    log('erreur:', e.message);
    sendJSON(res, 500, { error: 'serveur', message: e.message });
  }
});

server.listen(PORT, () => {
  log(`Kalan sur ${APP_URL} (port ${PORT}) — Wave: ${WAVE_API_KEY ? 'RÉEL (clé configurée)' : 'DÉMO (pas de clé)'}`);
  if (WAVE_API_KEY && !WAVE_WEBHOOK_SECRET) log('⚠ WAVE_WEBHOOK_SECRET manquant : les webhooks seront rejetés. La confirmation reposera sur la réconciliation /api/order.');
});

module.exports = { verifyWaveSignature }; // exposé pour les tests
