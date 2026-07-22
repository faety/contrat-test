/*
  Tests serveur des abonnements Echo : prix promo (bascule au 5 août 2026 11h59 GMT),
  activation, prolongation additive, blocage de l'inscription gratuite, noms de reçus.
  Lancer :  node test-sub.js
*/
'use strict';
const assert = require('assert');
const mail = require('./lib/mail'); mail._setTransport({ sendMail: async () => {} });
const H = require('./lib/handlers'); const store = require('./lib/store'); const w = require('./lib/wave');
let n = 0; const ok = s => console.log(`  ✓ ${++n}. ${s}`);
(async () => {
  console.log('Tests abonnements Echo (mémoire)');
  const y = w.SUB_PLANS['echo-y'];
  assert.strictEqual(w.planPrice(y, Date.UTC(2026, 7, 5, 11, 59, 58)), 10000);
  assert.strictEqual(w.planPrice(y, Date.UTC(2026, 7, 5, 12, 0, 0)), 20000);
  assert.strictEqual(w.planPrice(w.SUB_PLANS['echo-m']), 2000);
  ok('prix serveur : promo annuelle 10 000 F jusqu\'au 5 août 11h59 GMT, puis 20 000 F');

  await H.afterPaid(await store.create({ ref: 'KL-S1', courseId: 'echo-m', amount: 2000, status: 'paid', buyer: { prenom: 'Awa', nom: 'K', whatsapp: 'x', email: 's@x.com' } }));
  const sent = []; mail._setTransport({ sendMail: async m => sent.push(m) });
  await H.authRequest({ email: 's@x.com' });
  const code = sent[sent.length - 1].subject.match(/(\d{6})/)[1];
  const v = await H.authVerify({ email: 's@x.com', code });
  let e = v.body.enrollments.find(x => x.courseId === 'echo');
  assert.ok(e && e.paid && Math.round((e.expiresAt - Date.now()) / 86400e3) === 31);
  ok('paiement mensuel → accès « echo » daté (31 jours), lié au compte');

  await H.afterPaid(await store.create({ ref: 'KL-S2', courseId: 'echo-y', amount: 10000, status: 'paid', buyer: { email: 's@x.com', prenom: 'A', nom: 'K', whatsapp: 'x' } }));
  e = (await H.me('Bearer ' + v.body.token)).body.enrollments.find(x => x.courseId === 'echo');
  assert.strictEqual(Math.round((e.expiresAt - Date.now()) / 86400e3), 397);
  ok('renouvellement : les jours s\'ADDITIONNENT (31 + 366 = 397)');

  assert.strictEqual((await H.meEnroll('Bearer ' + v.body.token, { courseId: 'echo' })).status, 400);
  ok('« echo » jamais accessible par inscription gratuite (400)');

  assert.ok(/abonnement mensuel/.test(w.COURSE_NAMES['echo-m']) && /abonnement annuel/.test(w.COURSE_NAMES['echo-y']));
  ok('noms de reçus des plans présents');
  console.log(`\n${n}/${n} tests abonnements OK ✔`);
})().catch(e => { console.error('✗ ÉCHEC :', e.message, '\n', e.stack); process.exit(1); });
