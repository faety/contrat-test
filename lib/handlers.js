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
const mail = require('./mail');
const auth = require('./auth');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';

async function health() {
  return { status: 200, body: { ok: true, wave: wave.isLive(), demo: !wave.isLive(), store: store.kind, admin: !!ADMIN_PASSWORD, mail: mail.isConfigured(), accounts: true } };
}

/* Lie une commande payée au compte de l'acheteur (par e-mail) : le cours devient
   accessible depuis n'importe quel appareil après connexion. Crée un compte minimal
   si l'acheteur n'en a pas encore (paiement avant création de compte). */
async function linkPaidToAccount(o) {
  try {
    const email = auth.normEmail(o.buyer && o.buyer.email);
    if (!auth.validEmail(email)) return;
    let user = await store.userGetByEmail(email);
    if (!user) user = await store.userCreate({ email, prenom: (o.buyer && o.buyer.prenom) || '', nom: (o.buyer && o.buyer.nom) || '', whatsapp: (o.buyer && o.buyer.whatsapp) || '', points: 20 });
    await store.enrollmentUpsert(user.id, o.courseId, { paid: true, orderRef: o.ref });
  } catch (e) { /* ne bloque jamais le paiement */ }
}

/* Après le passage d'une commande en « payé » : lien au compte, puis reçu au client +
   notification interne, une seule fois (flag emailed). Ne bloque jamais le paiement. */
async function afterPaid(o) {
  if (!o || o.status !== 'paid') return o;
  await linkPaidToAccount(o);
  if (o.emailed || !mail.isConfigured()) return o;
  try {
    const name = wave.COURSE_NAMES[o.courseId] || o.courseId;
    const [r] = await Promise.allSettled([mail.sendReceipt(o, name), mail.sendSaleNotification(o, name)]);
    if (r.status === 'fulfilled' && r.value.sent) o = (await store.update(o.ref, { emailed: true })) || o;
  } catch (e) { /* l'email ne doit jamais faire échouer la commande */ }
  return o;
}

/* ============ Comptes serveur (inscription, connexion par code, session) ============ */
async function hydrate(user) {
  const [enrollments, progress] = await Promise.all([store.enrollmentsByUser(user.id), store.progressByUser(user.id)]);
  return {
    user: { email: user.email, prenom: user.prenom, nom: user.nom, whatsapp: user.whatsapp, prefix: user.prefix || '+225', points: user.points || 0 },
    enrollments, progress, notifSeenAt: user.notifSeenAt || 0, hasPassword: !!user.passwordHash,
  };
}
async function issueSession(user) {
  const token = auth.newToken();
  await store.sessionCreate(user.id, auth.hashToken(token), Date.now() + auth.SESSION_TTL_MS);
  return token;
}
async function emailCode(email) {
  const code = auth.newCode();
  await store.codeSet(email, auth.hashCode(email, code), Date.now() + auth.CODE_TTL_MS);
  await mail.sendLoginCode(email, code);
}
function cleanName(s, n = 60) { return String(s || '').trim().slice(0, n); }

/* Inscription : e-mail nouveau → compte + session immédiats (fluide). E-mail déjà
   existant → on exige un code envoyé par e-mail (empêche le vol de compte). */
async function signup(input) {
  const email = auth.normEmail(input && input.email);
  if (!auth.validEmail(email)) return { status: 400, body: { error: 'email-invalide' } };
  const existing = await store.userGetByEmail(email);
  if (existing) { await emailCode(email); return { status: 200, body: { needsCode: true, reason: 'exists' } }; }
  const passwordHash = auth.validPassword(input && input.password) ? auth.hashPassword(input.password) : null;
  const user = await store.userCreate({
    email, prenom: cleanName(input.prenom), nom: cleanName(input.nom),
    whatsapp: cleanName(input.whatsapp, 24), prefix: cleanName(input.prefix, 6) || '+225', points: 20, passwordHash,
  });
  const token = await issueSession(user);
  mail.sendWelcome({ prenom: user.prenom, email }).catch(() => {});
  return { status: 200, body: { token, ...(await hydrate(user)) } };
}

/* Connexion : envoie un code si le compte existe (réponse identique quoi qu'il arrive,
   pour ne pas révéler quels e-mails ont un compte). */
async function authRequest(input) {
  const email = auth.normEmail(input && input.email);
  if (!auth.validEmail(email)) return { status: 400, body: { error: 'email-invalide' } };
  const existing = await store.userGetByEmail(email);
  if (existing) await emailCode(email);
  return { status: 200, body: { sent: true } };
}

async function authVerify(input) {
  const email = auth.normEmail(input && input.email);
  const code = String((input && input.code) || '').trim();
  if (!auth.validEmail(email) || !/^\d{6}$/.test(code)) return { status: 400, body: { error: 'invalide' } };
  const rec = await store.codeGet(email);
  if (!rec) return { status: 400, body: { error: 'code-absent' } };
  if (rec.expiresAt < Date.now()) { await store.codeClear(email); return { status: 400, body: { error: 'code-expire' } }; }
  if (rec.attempts >= auth.CODE_MAX_ATTEMPTS) { await store.codeClear(email); return { status: 429, body: { error: 'trop-d-essais' } }; }
  if (!auth.safeEqual(rec.hash, auth.hashCode(email, code))) { await store.codeAttempt(email); return { status: 400, body: { error: 'code-incorrect' } }; }
  await store.codeClear(email);
  let user = await store.userGetByEmail(email);
  if (!user) {
    user = await store.userCreate({ email, prenom: cleanName(input.prenom), nom: cleanName(input.nom), whatsapp: cleanName(input.whatsapp, 24), prefix: cleanName(input.prefix, 6) || '+225', points: 20 });
    mail.sendWelcome({ prenom: user.prenom, email }).catch(() => {});
  } else {
    const patch = {};
    if (input.prenom && !user.prenom) patch.prenom = cleanName(input.prenom);
    if (input.nom && !user.nom) patch.nom = cleanName(input.nom);
    if (input.whatsapp && !user.whatsapp) patch.whatsapp = cleanName(input.whatsapp, 24);
    if (Object.keys(patch).length) user = await store.userUpdate(user.id, patch);
  }
  /* Le code e-mail peut aussi définir/réinitialiser un mot de passe (« mot de passe oublié »). */
  if (auth.validPassword(input && input.password)) {
    await store.userSetPassword(user.id, auth.hashPassword(input.password));
    user = await store.userGetById(user.id);
  }
  const token = await issueSession(user);
  return { status: 200, body: { token, ...(await hydrate(user)) } };
}

/* Connexion directe par e-mail + mot de passe (sans code e-mail). */
async function authLogin(input) {
  const email = auth.normEmail(input && input.email);
  const password = String((input && input.password) || '');
  if (!auth.validEmail(email) || !password) return { status: 400, body: { error: 'invalide' } };
  const user = await store.userGetByEmail(email);
  if (!user) return { status: 401, body: { error: 'identifiants' } };
  if (!user.passwordHash) return { status: 409, body: { error: 'no-password' } }; // compte sans mot de passe → code e-mail
  if (!auth.verifyPassword(password, user.passwordHash)) return { status: 401, body: { error: 'identifiants' } };
  const token = await issueSession(user);
  return { status: 200, body: { token, ...(await hydrate(user)) } };
}

function bearer(header) { const m = /^Bearer\s+(.+)$/i.exec(header || ''); return m ? m[1].trim() : null; }
async function userFromAuth(header) { const t = bearer(header); return t ? store.sessionUser(auth.hashToken(t)) : null; }

async function me(header) {
  const user = await userFromAuth(header);
  if (!user) return { status: 401, body: { error: 'non-connecte' } };
  return { status: 200, body: await hydrate(user) };
}

/* Inscription à un cours GRATUIT (les payants passent par /api/checkout). */
async function meEnroll(header, input) {
  const user = await userFromAuth(header);
  if (!user) return { status: 401, body: { error: 'non-connecte' } };
  const courseId = String((input && input.courseId) || '');
  if (!wave.isCourse(courseId)) return { status: 400, body: { error: 'cours-inconnu' } };
  if (wave.PRICES[courseId]) return { status: 400, body: { error: 'cours-payant' } };
  await store.enrollmentUpsert(user.id, courseId, { paid: false });
  return { status: 200, body: await hydrate(user) };
}

/* Marque une leçon terminée (+10 points, une seule fois). */
async function meProgress(header, input) {
  let user = await userFromAuth(header);
  if (!user) return { status: 401, body: { error: 'non-connecte' } };
  const courseId = String((input && input.courseId) || '');
  const lessonKey = String((input && input.lessonKey) || '');
  if (!wave.isCourse(courseId) || !/^l\d+$/.test(lessonKey)) return { status: 400, body: { error: 'invalide' } };
  const enr = await store.enrollmentsByUser(user.id);
  if (!enr.some(e => e.courseId === courseId)) return { status: 403, body: { error: 'non-inscrit' } };
  const r = await store.progressAdd(user.id, courseId, lessonKey);
  if (r.added) user = await store.userUpdate(user.id, { points: (user.points || 0) + 10 });
  return { status: 200, body: await hydrate(user) };
}

async function logout(header) {
  const t = bearer(header);
  if (t) await store.sessionDelete(auth.hashToken(t));
  return { status: 200, body: { ok: true } };
}

/* Définit / change le mot de passe du compte connecté. */
async function setPassword(header, input) {
  const user = await userFromAuth(header);
  if (!user) return { status: 401, body: { error: 'non-connecte' } };
  const pw = String((input && input.password) || '');
  if (!auth.validPassword(pw)) return { status: 400, body: { error: 'mot-de-passe-court', message: `Le mot de passe doit faire au moins ${auth.PASSWORD_MIN} caractères.` } };
  await store.userSetPassword(user.id, auth.hashPassword(pw));
  const fresh = await store.userGetById(user.id);
  return { status: 200, body: { ok: true, ...(await hydrate(fresh || user)) } };
}

/* Marque les notifications comme lues (horodatage serveur, synchronisé multi-appareils). */
async function meSeen(header) {
  const user = await userFromAuth(header);
  if (!user) return { status: 401, body: { error: 'non-connecte' } };
  await store.userSeenNotif(user.id, Date.now());
  const fresh = await store.userGetById(user.id);
  return { status: 200, body: await hydrate(fresh || user) };
}

/* ============ Annonces (notifications) ============ */
function announcementRow(a) { return { id: a.id, title: a.title || '', body: a.body || '', at: a.at || null }; }

/* Liste publique des annonces — alimente le centre de notifications et le fil communauté. */
async function announcements() {
  const list = await store.announcementList(30);
  return { status: 200, body: { announcements: list.map(announcementRow) } };
}

/* Admin : publie une annonce (notifie tous les membres) + envoi e-mail optionnel. */
async function adminAnnounce(adminKey, body) {
  if (!ADMIN_PASSWORD) return { status: 503, body: { error: 'admin-non-configure' } };
  if (!adminAuthOK(adminKey)) return { status: 401, body: { error: 'non-autorise' } };
  const title = String((body && body.title) || '').trim().slice(0, 120);
  const text = String((body && body.body) || '').trim().slice(0, 4000);
  if (text.length < 3) return { status: 400, body: { error: 'message-vide', message: 'Écris le message de l\'annonce.' } };
  const created = await store.announcementCreate({ title, body: text });
  let emailed = 0;
  if (body && body.email && mail.isConfigured()) {
    try {
      const emails = await store.userAllEmails();
      const uniq = [...new Set(emails.filter(Boolean))];
      const results = await Promise.allSettled(uniq.map(e => mail.sendAnnouncement(e, { title, body: text })));
      emailed = results.filter(r => r.status === 'fulfilled' && r.value && r.value.sent).length;
    } catch (e) { /* l'e-mail ne doit jamais bloquer la publication */ }
  }
  const list = await store.announcementList(30);
  return { status: 200, body: { ok: true, emailed, announcements: list.map(announcementRow) } };
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
    const created = await store.create(order);
    if (couponCode) await store.couponBump(couponCode);
    await afterPaid(created || order);
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

function orderRow(o) {
  return {
    ref: o.ref, courseId: o.courseId, name: wave.COURSE_NAMES[o.courseId] || o.courseId,
    amount: o.amount, status: o.status, coupon: o.coupon || null,
    transactionId: o.transactionId || null, createdAt: o.createdAt || null,
    buyer: o.buyer ? { prenom: o.buyer.prenom, nom: o.buyer.nom, whatsapp: o.buyer.whatsapp, email: o.buyer.email } : null,
  };
}

async function adminStats(adminKey) {
  if (!ADMIN_PASSWORD) return { status: 503, body: { error: 'admin-non-configure' } };
  if (!adminAuthOK(adminKey)) return { status: 401, body: { error: 'non-autorise' } };
  const [stats, members, enroll, list] = await Promise.all([
    store.orderStats(),
    store.userCount(),
    store.enrollmentTotals(),
    store.orderList(12),
  ]);
  stats.byCourse = stats.byCourse
    .map(x => ({ ...x, name: wave.COURSE_NAMES[x.courseId] || x.courseId }))
    .sort((a, b) => b.revenue - a.revenue);
  stats.members = members;
  stats.enrollments = enroll.total;
  stats.paidEnrollments = enroll.paid;
  stats.payingMembers = enroll.withPaidMembers;
  const config = {
    wave: wave.isLive(), mail: mail.isConfigured(), store: store.kind,
    accounts: true, notify: !!process.env.NOTIFY_EMAIL,
    appUrl: (process.env.APP_URL || '').replace(/\/$/, ''),
  };
  return { status: 200, body: { stats, recent: list.map(orderRow), config } };
}

async function adminOrders(adminKey, query) {
  if (!ADMIN_PASSWORD) return { status: 503, body: { error: 'admin-non-configure' } };
  if (!adminAuthOK(adminKey)) return { status: 401, body: { error: 'non-autorise' } };
  const status = (query && query.status) || 'all';
  const q = (query && query.q) || '';
  const list = await store.orderSearch({ status, q, limit: 60 });
  return { status: 200, body: { orders: list.map(orderRow) } };
}

async function adminUsers(adminKey, query) {
  if (!ADMIN_PASSWORD) return { status: 503, body: { error: 'admin-non-configure' } };
  if (!adminAuthOK(adminKey)) return { status: 401, body: { error: 'non-autorise' } };
  const q = (query && query.q) || '';
  const users = await store.userList(60, q);
  return { status: 200, body: { users } };
}

/* Confirme une commande en interrogeant Wave (source de vérité, authentifiée par la clé API).
   Utilisé par le webhook ET par /api/order : indépendant de la signature du webhook. */
async function confirmViaWave(o) {
  if (!o || o.status === 'paid' || !wave.isLive()) return o;
  try {
    let s = o.waveSessionId ? await wave.getSession(o.waveSessionId) : null;
    if (!s) s = await wave.findByReference(o.ref);
    if (wave.sessionPaid(s)) {
      const upd = await store.update(o.ref, { status: 'paid', transactionId: (s && s.transaction_id) || null, waveSessionId: s && s.id });
      return await afterPaid(upd);
    }
    if (wave.sessionExpired(s) && o.status === 'pending') {
      return await store.update(o.ref, { status: 'failed', lastError: 'expired' });
    }
  } catch (e) { /* réseau : on laisse en l'état, une prochaine tentative réessaiera */ }
  return o;
}

async function webhook(rawBody, signatureHeader) {
  let evt; try { evt = JSON.parse(rawBody); } catch (e) { return { status: 400, body: { error: 'json' } }; }
  const valid = wave.verifyWaveSignature(signatureHeader, rawBody);
  const s = evt.data || {};
  let order = s.client_reference ? await store.get(s.client_reference) : null;
  if (!order && s.id) order = await store.findBySessionId(s.id);

  if (evt.type === 'checkout.session.completed') {
    if (order && order.status !== 'paid') {
      if (valid) {
        /* Signature OK : on fait confiance au payload. */
        const upd = await store.update(order.ref, { status: 'paid', transactionId: s.transaction_id || null, waveSessionId: s.id });
        await afterPaid(upd);
      } else {
        /* Signature absente/incorrecte : on confirme quand même via l'API Wave authentifiée. */
        await confirmViaWave(order);
      }
    }
  } else if (evt.type === 'checkout.session.payment_failed') {
    if (order && order.status === 'pending') {
      await store.update(order.ref, { status: 'failed', lastError: (s.last_payment_error && s.last_payment_error.code) || 'payment_failed' });
    }
  }
  /* On répond 200 même si la signature n'était pas valide, car la confirmation
     réelle passe par l'API Wave (aucune donnée non vérifiée n'est acceptée). */
  return { status: 200, body: { received: true, verified: valid } };
}

async function order(ref) {
  let o = ref ? await store.get(ref) : null;
  if (!o) return { status: 404, body: { error: 'introuvable' } };
  if (o.status === 'pending') o = await confirmViaWave(o);
  return {
    status: 200,
    body: {
      ref: o.ref, status: o.status, courseId: o.courseId, amount: o.amount,
      transactionId: o.transactionId || null, courseName: wave.COURSE_NAMES[o.courseId] || o.courseId,
    },
  };
}

/* Email de bienvenue à la création de compte (appelé par le front, non bloquant).
   Sans configuration SMTP : répond ok sans rien envoyer. */
async function welcome(input) {
  const prenom = String((input && input.prenom) || '').trim().slice(0, 60);
  const email = String((input && input.email) || '').trim().slice(0, 120);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return { status: 400, body: { error: 'email-invalide' } };
  if (!mail.isConfigured()) return { status: 200, body: { sent: false } };
  const r = await mail.sendWelcome({ prenom, email });
  return { status: 200, body: { sent: !!r.sent } };
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

/* Base URL de retour : on privilégie l'origine RÉELLE du visiteur (en-têtes), pour qu'il
   revienne sur la même URL que celle où il a commencé (et où sa commande est en attente).
   APP_URL ne sert que de repli si l'hôte n'est pas transmis. */
function baseUrlFrom(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  let proto = (req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  if (!proto) proto = /^(localhost|127\.0\.0\.1|\[::1\])/.test(host || '') ? 'http' : 'https';
  if (host) return `${proto}://${host}`;
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  return '';
}

module.exports = {
  health, checkout, couponPreview, adminCoupons, adminStats, adminOrders, adminUsers, webhook, order, welcome, afterPaid,
  signup, authRequest, authVerify, authLogin, setPassword, me, meEnroll, meProgress, meSeen, logout,
  announcements, adminAnnounce,
  readRawBody, baseUrlFrom,
};
