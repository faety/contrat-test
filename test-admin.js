/*
  Tests des endpoints d'administration (stats enrichies, commandes, membres).
  Auth par x-admin-key ; stockage mémoire.
  Lancer :  ADMIN_PASSWORD=secret node test-admin.js  (défini automatiquement ci-dessous)
*/
'use strict';
process.env.ADMIN_PASSWORD = 'secret-admin';
process.env.NOTIFY_EMAIL = 'admin@test.local';
const assert = require('assert');
const mail = require('./lib/mail');
mail._setTransport({ sendMail: async () => {} });
const H = require('./lib/handlers');
const store = require('./lib/store');
const KEY = 'secret-admin';

let n = 0; const ok = (s) => console.log(`  ✓ ${++n}. ${s}`);

(async () => {
  console.log('Tests admin (mémoire)');

  /* Auth */
  assert.strictEqual((await H.adminStats('mauvais')).status, 401);
  assert.strictEqual((await H.adminOrders('', {})).status, 401);
  assert.strictEqual((await H.adminUsers('', {})).status, 401);
  ok('endpoints admin protégés (401 sans bon mot de passe)');

  /* Prépare des données : 2 comptes, quelques commandes */
  const s1 = await H.signup({ prenom: 'Awa', nom: 'Kouassi', whatsapp: '0576020058', email: 'awa@test.local' });
  await H.meEnroll('Bearer ' + s1.body.token, { courseId: 'ia' });
  await H.signup({ prenom: 'Ben', nom: 'Traore', whatsapp: '0700000001', email: 'ben@test.local' });
  await H.afterPaid(await store.create({ ref: 'KL-A1', courseId: 'chatgpt', amount: 5000, status: 'paid', buyer: { prenom: 'Awa', nom: 'Kouassi', whatsapp: '+2250576020058', email: 'awa@test.local' } }));
  await store.create({ ref: 'KL-A2', courseId: 'claude', amount: 5000, status: 'pending', buyer: { prenom: 'Ben', nom: 'Traore', whatsapp: '+2250700000001', email: 'ben@test.local' } });
  await H.afterPaid(await store.create({ ref: 'KL-A3', courseId: 'copilot', amount: 200, status: 'paid', coupon: 'CADEAU200', buyer: { prenom: 'Cyr', nom: 'Koffi', whatsapp: '+2250700000002', email: 'cyr@test.local' } }));

  /* Stats enrichies */
  const st = await H.adminStats(KEY);
  assert.strictEqual(st.status, 200);
  const S = st.body.stats;
  assert.strictEqual(S.paid, 2, 'commandes payées');
  assert.strictEqual(S.revenue, 5200, 'CA = 5000 + 200');
  assert.ok(S.members >= 3, 'membres comptés (awa, ben, + cyr créé par paiement)');
  assert.ok(S.enrollments >= 3, 'cours débloqués comptés');
  assert.ok(st.body.config && st.body.config.accounts === true && st.body.config.store, 'config présente');
  ok('stats enrichies : CA, payées, membres, cours débloqués, config');

  /* Commandes : filtre + recherche */
  const all = await H.adminOrders(KEY, { status: 'all' });
  assert.ok(all.body.orders.length >= 3);
  const paid = await H.adminOrders(KEY, { status: 'paid' });
  assert.ok(paid.body.orders.every(o => o.status === 'paid') && paid.body.orders.length === 2);
  ok('commandes : filtre par statut (payées)');
  const byRef = await H.adminOrders(KEY, { q: 'KL-A2' });
  assert.ok(byRef.body.orders.length === 1 && byRef.body.orders[0].ref === 'KL-A2');
  const byEmail = await H.adminOrders(KEY, { q: 'cyr@test.local' });
  assert.ok(byEmail.body.orders.length === 1 && byEmail.body.orders[0].coupon === 'CADEAU200');
  ok('commandes : recherche par référence et par e-mail');

  /* Membres : liste + recherche + agrégats */
  const users = await H.adminUsers(KEY, {});
  assert.ok(users.body.users.length >= 3);
  const awa = users.body.users.find(u => u.email === 'awa@test.local');
  assert.ok(awa && awa.courses >= 2 && awa.paidCourses >= 1, 'agrégats cours/payés par membre');
  const search = await H.adminUsers(KEY, { q: 'traore' });
  assert.ok(search.body.users.length === 1 && search.body.users[0].email === 'ben@test.local');
  ok('membres : liste avec agrégats + recherche par nom');

  console.log(`\n${n}/${n} tests admin OK ✔`);
})().catch(e => { console.error('✗ ÉCHEC :', e.message, '\n', e.stack); process.exit(1); });
