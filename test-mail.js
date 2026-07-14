/*
  Tests des emails transactionnels (transport SMTP simulé, aucun envoi réel).
  Lancer :  node test-mail.js
*/
'use strict';
process.env.NOTIFY_EMAIL = 'admin@test.local';

const assert = require('assert');
const mail = require('./lib/mail');
const H = require('./lib/handlers');
const store = require('./lib/store');

const sent = [];
mail._setTransport({ sendMail: async (opts) => { sent.push(opts); } });

let n = 0;
const ok = (name) => console.log(`  ✓ ${++n}. ${name}`);

(async () => {
  console.log('Tests emails (transport simulé)');

  /* 1. isConfigured devient vrai avec un transport injecté */
  assert.strictEqual(mail.isConfigured(), true);
  ok('transport injecté → mail configuré');

  /* 2. Bienvenue : email invalide refusé */
  const bad = await H.welcome({ prenom: 'Awa', email: 'pas-un-email' });
  assert.strictEqual(bad.status, 400);
  ok('bienvenue : email invalide → 400');

  /* 3. Bienvenue : envoi réel via le transport simulé */
  const w = await H.welcome({ prenom: 'Awa', email: 'awa@test.local' });
  assert.strictEqual(w.status, 200);
  assert.strictEqual(w.body.sent, true);
  const wm = sent[sent.length - 1];
  assert.strictEqual(wm.to, 'awa@test.local');
  assert.ok(/Bienvenue/.test(wm.subject));
  assert.ok(wm.html.includes('Awa'));
  ok('bienvenue : envoyé au bon destinataire, prénom inclus');

  /* 4. Reçu après paiement : envoyé une seule fois (flag emailed) */
  const order = await store.create({
    ref: 'KL-TESTMAIL1', courseId: 'chatgpt', amount: 200, status: 'paid',
    coupon: 'CADEAU200',
    buyer: { prenom: 'Ibrahim', nom: 'Test', whatsapp: '0700000000', email: 'ibrahim@test.local' },
  });
  const before = sent.length;
  const o2 = await H.afterPaid(order);
  assert.strictEqual(o2.emailed, true);
  const receipt = sent.find(m => m.to === 'ibrahim@test.local' && /Reçu/.test(m.subject));
  assert.ok(receipt, 'reçu client envoyé');
  assert.ok(receipt.html.includes('KL-TESTMAIL1'));
  assert.ok(receipt.html.includes('200'));
  const notif = sent.find(m => m.to === 'admin@test.local');
  assert.ok(notif, 'notification interne envoyée');
  assert.ok(/Vente/.test(notif.subject));
  ok('paiement : reçu client + notification interne, référence et montant inclus');

  /* 5. Pas de doublon au second appel */
  const afterFirst = sent.length;
  await H.afterPaid(o2);
  assert.strictEqual(sent.length, afterFirst);
  ok('aucun doublon : le reçu ne part qu\'une fois');

  /* 6. Commande gratuite (coupon 100 %) : sujet « Inscription confirmée » */
  const free = await store.create({
    ref: 'KL-TESTMAIL2', courseId: 'claude', amount: 0, status: 'paid',
    buyer: { prenom: 'Fanta', nom: 'Test', whatsapp: '0700000001', email: 'fanta@test.local' },
  });
  await H.afterPaid(free);
  const fm = sent.find(m => m.to === 'fanta@test.local');
  assert.ok(fm && /Inscription confirmée/.test(fm.subject));
  ok('cours gratuit : sujet « Inscription confirmée »');

  /* 7. Pas d'email d'acheteur → pas d'envoi, pas d'erreur */
  const noMail = await store.create({ ref: 'KL-TESTMAIL3', courseId: 'copilot', amount: 5000, status: 'paid', buyer: { prenom: 'X' } });
  const cnt = sent.length;
  await H.afterPaid(noMail);
  assert.ok(sent.length === cnt + 1 || sent.length === cnt); // seule la notif interne peut partir
  assert.ok(!sent.slice(cnt).some(m => m.to !== 'admin@test.local'));
  ok('acheteur sans email : aucun envoi client, aucun crash');

  /* 8. Échec SMTP : la commande n'est pas marquée emailed (nouvel essai possible) */
  mail._setTransport({ sendMail: async () => { throw new Error('smtp down'); } });
  const fail = await store.create({
    ref: 'KL-TESTMAIL4', courseId: 'chatgpt', amount: 5000, status: 'paid',
    buyer: { prenom: 'Yao', nom: 'Test', whatsapp: '0700000002', email: 'yao@test.local' },
  });
  const f2 = await H.afterPaid(fail);
  assert.ok(!f2.emailed);
  ok('panne SMTP : commande non marquée « emailed », renvoi possible plus tard');

  console.log(`\n${n}/${n} tests emails OK ✔`);
})().catch(e => { console.error('✗ ÉCHEC :', e.message); process.exit(1); });
