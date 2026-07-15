/*
  Tests des comptes serveur (inscription, connexion par code, session, progression,
  liaison paiement→compte). Stockage mémoire, e-mails capturés (aucun envoi réel).
  Lancer :  node test-accounts.js
*/
'use strict';
const assert = require('assert');
const mail = require('./lib/mail');
const H = require('./lib/handlers');

/* Capture des e-mails pour récupérer les codes à 6 chiffres. */
const sent = [];
mail._setTransport({ sendMail: async (o) => { sent.push(o); } });
const lastCodeFor = (email) => {
  for (let i = sent.length - 1; i >= 0; i--) {
    const m = sent[i];
    if (m.to === email && /code/i.test(m.subject)) { const g = m.subject.match(/(\d{6})/); if (g) return g[1]; }
  }
  return null;
};

let n = 0;
const ok = (name) => console.log(`  ✓ ${++n}. ${name}`);
const tok = (r) => r.body.token;

(async () => {
  console.log('Tests comptes serveur (mémoire)');

  /* 1. Inscription e-mail nouveau → compte + session immédiats */
  const s1 = await H.signup({ prenom: 'Awa', nom: 'Kouassi', whatsapp: '0576020058', prefix: '+225', email: 'awa@test.local' });
  assert.strictEqual(s1.status, 200);
  assert.ok(s1.body.token, 'jeton renvoyé');
  assert.strictEqual(s1.body.user.prenom, 'Awa');
  assert.strictEqual(s1.body.user.points, 20);
  assert.deepStrictEqual(s1.body.enrollments, []);
  ok('inscription (e-mail nouveau) → jeton + compte + 20 points');
  const t1 = tok(s1);

  /* 2. /me avec jeton */
  const meR = await H.me('Bearer ' + t1);
  assert.strictEqual(meR.status, 200);
  assert.strictEqual(meR.body.user.email, 'awa@test.local');
  ok('/me renvoie le compte avec le jeton');

  /* 3. /me sans jeton valide → 401 */
  assert.strictEqual((await H.me('Bearer faux')).status, 401);
  assert.strictEqual((await H.me('')).status, 401);
  ok('/me refuse un jeton absent/invalide (401)');

  /* 4. Inscription cours gratuit */
  const e1 = await H.meEnroll('Bearer ' + t1, { courseId: 'ia' });
  assert.strictEqual(e1.status, 200);
  assert.ok(e1.body.enrollments.some(x => x.courseId === 'ia'));
  ok('inscription à un cours gratuit enregistrée sur le compte');

  /* 5. Cours payant via /me/enroll refusé (passe par le paiement) */
  assert.strictEqual((await H.meEnroll('Bearer ' + t1, { courseId: 'chatgpt' })).status, 400);
  ok('cours payant refusé par /me/enroll (400)');

  /* 6. Progression +10 points, une seule fois */
  const p1 = await H.meProgress('Bearer ' + t1, { courseId: 'ia', lessonKey: 'l0' });
  assert.strictEqual(p1.status, 200);
  assert.strictEqual(p1.body.user.points, 30);
  assert.ok(p1.body.progress.some(x => x.courseId === 'ia' && x.lessonKey === 'l0'));
  const p2 = await H.meProgress('Bearer ' + t1, { courseId: 'ia', lessonKey: 'l0' });
  assert.strictEqual(p2.body.user.points, 30);
  ok('leçon terminée = +10 points (pas de double comptage)');

  /* 7. Progression sur un cours non inscrit → 403 */
  assert.strictEqual((await H.meProgress('Bearer ' + t1, { courseId: 'chatgpt', lessonKey: 'l0' })).status, 403);
  ok('progression refusée si non inscrit au cours (403)');

  /* 8. Ré-inscription avec e-mail existant → exige un code (anti-usurpation) */
  const s2 = await H.signup({ prenom: 'Pirate', email: 'awa@test.local' });
  assert.strictEqual(s2.status, 200);
  assert.strictEqual(s2.body.needsCode, true);
  assert.ok(!s2.body.token, 'aucun jeton livré sans code');
  ok('e-mail déjà utilisé → needsCode, aucun jeton livré');

  /* 9. Vérification mauvais code → 400 */
  assert.strictEqual((await H.authVerify({ email: 'awa@test.local', code: '000000' })).status, 400);
  ok('code incorrect refusé (400)');

  /* 10. Connexion « autre appareil » : demande de code + vérification → retrouve les cours */
  await H.authRequest({ email: 'awa@test.local' });
  const code = lastCodeFor('awa@test.local');
  assert.ok(/^\d{6}$/.test(code || ''), 'code à 6 chiffres reçu par e-mail');
  const v = await H.authVerify({ email: 'awa@test.local', code });
  assert.strictEqual(v.status, 200);
  assert.ok(v.body.token && v.body.token !== t1, 'nouvelle session');
  assert.ok(v.body.enrollments.some(x => x.courseId === 'ia'), 'cours retrouvé après connexion');
  assert.ok(v.body.progress.some(x => x.lessonKey === 'l0'), 'progression retrouvée');
  assert.strictEqual(v.body.user.points, 30);
  ok('connexion par code depuis un autre appareil → cours + progression + points retrouvés');

  /* 11. authRequest sur e-mail inconnu → réponse neutre, aucun e-mail */
  const before = sent.length;
  const ar = await H.authRequest({ email: 'inconnu@test.local' });
  assert.strictEqual(ar.status, 200);
  assert.strictEqual(sent.length, before, 'aucun e-mail envoyé à un inconnu');
  ok('demande de code sur e-mail inconnu : réponse neutre, aucun envoi');

  /* 12. Déconnexion invalide la session */
  const t2 = tok(v);
  assert.strictEqual((await H.logout('Bearer ' + t2)).status, 200);
  assert.strictEqual((await H.me('Bearer ' + t2)).status, 401);
  ok('déconnexion : la session est invalidée');

  /* 13. Paiement lié au compte par e-mail (même sans compte préalable) */
  const store = require('./lib/store');
  const order = await store.create({ ref: 'KL-ACCT1', courseId: 'chatgpt', amount: 5000, status: 'paid',
    buyer: { prenom: 'Ibrahim', nom: 'Sow', whatsapp: '+2250700000000', email: 'ibrahim@test.local' } });
  await H.afterPaid(order);
  await H.authRequest({ email: 'ibrahim@test.local' });          // le compte a été créé par le paiement
  const code2 = lastCodeFor('ibrahim@test.local');
  const v2 = await H.authVerify({ email: 'ibrahim@test.local', code: code2 });
  assert.strictEqual(v2.status, 200);
  const enr = v2.body.enrollments.find(x => x.courseId === 'chatgpt');
  assert.ok(enr && enr.paid, 'cours payant lié au compte');
  ok('paiement lié au compte : le cours payé est retrouvé à la connexion');

  console.log(`\n${n}/${n} tests comptes OK ✔`);
})().catch(e => { console.error('✗ ÉCHEC :', e.message, '\n', e.stack); process.exit(1); });
