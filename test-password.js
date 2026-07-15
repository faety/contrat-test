/*
  Tests de l'authentification par mot de passe :
   - inscription avec mot de passe → connexion directe (sans code e-mail),
   - mauvais mot de passe refusé, e-mail inconnu refusé,
   - compte sans mot de passe → 409 (repli code e-mail),
   - définition/changement du mot de passe (connecté),
   - « mot de passe oublié » : le code e-mail réinitialise le mot de passe,
   - le hachage n'est jamais renvoyé au client.
  Lancer :  node test-password.js
*/
'use strict';
const assert = require('assert');
const auth = require('./lib/auth');
const mail = require('./lib/mail');
const sent = [];
mail._setTransport({ sendMail: async (m) => { sent.push(m); } });
const H = require('./lib/handlers');
const codeFor = (email) => {
  for (let i = sent.length - 1; i >= 0; i--) { const m = sent[i]; if (m.to === email && /code/i.test(m.subject)) { const g = (m.subject + ' ' + (m.text || '')).match(/(\d{6})/); if (g) return g[1]; } }
  return null;
};

let n = 0; const ok = (s) => console.log(`  ✓ ${++n}. ${s}`);

(async () => {
  console.log('Tests mot de passe (mémoire)');

  /* Hachage : robuste, jamais réversible, comparaison correcte */
  const h = auth.hashPassword('secret123');
  assert.ok(h.startsWith('scrypt$') && !h.includes('secret123'), 'stocké haché');
  assert.ok(auth.verifyPassword('secret123', h) && !auth.verifyPassword('mauvais', h));
  assert.ok(!auth.validPassword('123') && auth.validPassword('123456'));
  ok('hachage scrypt + validation (min 6 caractères)');

  /* Inscription avec mot de passe → connexion directe */
  const s = await H.signup({ prenom: 'Awa', nom: 'K', whatsapp: '0576020058', email: 'awa@test.local', password: 'monpass1' });
  assert.strictEqual(s.status, 200);
  assert.strictEqual(s.body.hasPassword, true, 'compte marqué « avec mot de passe »');
  assert.strictEqual(s.body.token && s.body.user && s.body.user.passwordHash, undefined, 'le hash n\'est jamais renvoyé');
  ok('inscription avec mot de passe : compte créé, hash non exposé');

  const good = await H.authLogin({ email: 'awa@test.local', password: 'monpass1' });
  assert.strictEqual(good.status, 200);
  assert.ok(good.body.token, 'jeton de session émis');
  ok('connexion e-mail + mot de passe (sans code e-mail)');

  assert.strictEqual((await H.authLogin({ email: 'awa@test.local', password: 'faux' })).status, 401);
  assert.strictEqual((await H.authLogin({ email: 'inconnu@test.local', password: 'x' })).status, 401);
  ok('mauvais mot de passe / e-mail inconnu → 401 (message neutre)');

  /* Compte sans mot de passe (ex. créé par un paiement) → 409 */
  await H.afterPaid({ ref: 'KL-PW', courseId: 'chatgpt', amount: 5000, status: 'paid', buyer: { prenom: 'Ben', nom: 'T', whatsapp: '+2250700000001', email: 'ben@test.local' } });
  const noPw = await H.authLogin({ email: 'ben@test.local', password: 'peu-importe' });
  assert.strictEqual(noPw.status, 409, 'compte sans mot de passe → 409 (repli code e-mail)');
  ok('compte sans mot de passe : 409 pour basculer sur le code e-mail');

  /* Le titulaire définit un mot de passe (connecté par code e-mail) */
  await H.authRequest({ email: 'ben@test.local' });
  const code = codeFor('ben@test.local');
  const v = await H.authVerify({ email: 'ben@test.local', code });
  assert.strictEqual(v.status, 200);
  const setp = await H.setPassword('Bearer ' + v.body.token, { password: 'benpass1' });
  assert.strictEqual(setp.status, 200);
  assert.strictEqual(setp.body.hasPassword, true);
  assert.strictEqual((await H.setPassword('Bearer ' + v.body.token, { password: '12' })).status, 400, 'trop court refusé');
  assert.strictEqual((await H.setPassword('', { password: 'benpass1' })).status, 401, 'session requise');
  ok('définition/changement du mot de passe (connecté), validations');
  assert.strictEqual((await H.authLogin({ email: 'ben@test.local', password: 'benpass1' })).status, 200);
  ok('connexion par mot de passe après définition');

  /* « Mot de passe oublié » : le code e-mail réinitialise le mot de passe */
  await H.authRequest({ email: 'awa@test.local' });
  const code2 = codeFor('awa@test.local');
  const reset = await H.authVerify({ email: 'awa@test.local', code: code2, password: 'nouveaupass' });
  assert.strictEqual(reset.status, 200);
  assert.strictEqual((await H.authLogin({ email: 'awa@test.local', password: 'monpass1' })).status, 401, 'ancien mot de passe invalidé');
  assert.strictEqual((await H.authLogin({ email: 'awa@test.local', password: 'nouveaupass' })).status, 200, 'nouveau mot de passe actif');
  ok('« mot de passe oublié » : le code e-mail réinitialise le mot de passe');

  console.log(`\n${n}/${n} tests mot de passe OK ✔`);
})().catch(e => { console.error('✗ ÉCHEC :', e.message, '\n', e.stack); process.exit(1); });
