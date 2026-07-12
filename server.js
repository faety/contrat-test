/*
  Kalan — serveur local (développement) et alternative auto-hébergée.
  Réutilise EXACTEMENT la même logique que les fonctions Vercel (dossier api/),
  via les modules partagés lib/handlers, lib/wave, lib/store.

  En production, on déploie plutôt sur Vercel (voir README + vercel.json + api/).
  Ce fichier sert à : développer en local, ou héberger sur un serveur Node classique.

  Démarrage :
    WAVE_API_KEY=... WAVE_WEBHOOK_SECRET=... DATABASE_URL=... APP_URL=https://... node server.js
  Sans WAVE_API_KEY → mode démo. Sans DATABASE_URL → stockage en mémoire (non persistant).
*/
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const H = require('./lib/handlers');
const wave = require('./lib/wave');
const store = require('./lib/store');

const PORT = parseInt(process.env.PORT || '3000', 10);
const INDEX = path.join(__dirname, 'index.html');
const log = (...a) => console.log(new Date().toISOString(), ...a);

function send(res, r) {
  const body = JSON.stringify(r.body);
  res.writeHead(r.status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') return send(res, await H.health());

    if (req.method === 'POST' && url.pathname === '/api/checkout') {
      const raw = await H.readRawBody(req);
      let input; try { input = JSON.parse(raw || '{}'); } catch (e) { return send(res, { status: 400, body: { error: 'json' } }); }
      const r = await H.checkout(input, H.baseUrlFrom(req));
      if (r.status === 200) log(`→ session Wave ${r.body.ref} (${input.courseId})`);
      return send(res, r);
    }

    if (req.method === 'POST' && url.pathname === '/api/wave/webhook') {
      const raw = await H.readRawBody(req);
      const r = await H.webhook(raw, req.headers['wave-signature']);
      if (r.status === 400) log('✗ webhook rejeté (signature)');
      return send(res, r);
    }

    if (req.method === 'GET' && url.pathname === '/api/order') {
      return send(res, await H.order(url.searchParams.get('ref') || ''));
    }

    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
      return res.end(fs.readFileSync(INDEX));
    }
    if (url.pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }

    send(res, { status: 404, body: { error: 'not-found' } });
  } catch (e) {
    log('erreur:', e.message);
    send(res, { status: 500, body: { error: 'serveur', message: e.message } });
  }
});

server.listen(PORT, () => {
  log(`Kalan sur http://localhost:${PORT} — Wave: ${wave.isLive() ? 'RÉEL' : 'DÉMO'} · stockage: ${store.kind}`);
  if (wave.isLive() && !process.env.WAVE_WEBHOOK_SECRET) log('⚠ WAVE_WEBHOOK_SECRET manquant : webhooks rejetés (la réconciliation /api/order prend le relais).');
});

module.exports = server;
