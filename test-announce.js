/*
  Tests des annonces (notifications) : publication admin, liste publique,
  diffusion e-mail optionnelle, horodatage « lu » synchronisé au compte.
  Lancer :  node test-announce.js
*/
'use strict';
process.env.ADMIN_PASSWORD = 'secret-admin';
const assert = require('assert');
const mail = require('./lib/mail');
const sent = [];
mail._setTransport({ sendMail: async (m) => { sent.push(m); } });
const H = require('./lib/handlers');
const KEY = 'secret-admin';

let n = 0; const ok = (s) => console.log(`  ✓ ${++n}. ${s}`);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log('Tests annonces / notifications (mémoire)');

  /* Auth : publication protégée */
  assert.strictEqual((await H.adminAnnounce('mauvais', { body: 'x' })).status, 401);
  ok('publication protégée (401 sans le bon mot de passe)');

  /* Message vide rejeté */
  assert.strictEqual((await H.adminAnnounce(KEY, { body: '  ' })).status, 400);
  ok('message vide rejeté (400)');

  /* Deux membres pour la diffusion e-mail */
  const s1 = await H.signup({ prenom: 'Awa', nom: 'K', whatsapp: '0576020058', email: 'awa@test.local' });
  await H.signup({ prenom: 'Ben', nom: 'T', whatsapp: '0700000001', email: 'ben@test.local' });
  sent.length = 0;

  /* Publication SANS e-mail : créée mais aucun envoi */
  const a1 = await H.adminAnnounce(KEY, { title: 'Bienvenue', body: 'Le premier message.' });
  assert.strictEqual(a1.status, 200);
  assert.strictEqual(a1.body.emailed, 0);
  assert.strictEqual(sent.length, 0, 'aucun e-mail sans la case cochée');
  ok('publication sans e-mail : créée, aucun envoi');

  await sleep(5);
  /* Publication AVEC e-mail : un envoi par membre */
  const a2 = await H.adminAnnounce(KEY, { title: 'Nouveau cours', body: 'Un **nouveau** cours est dispo !', email: true });
  assert.strictEqual(a2.status, 200);
  assert.strictEqual(a2.body.emailed, 2, 'un e-mail par membre');
  assert.strictEqual(sent.length, 2);
  assert.ok(sent.every(m => /nouveau cours/i.test(m.subject)), 'sujet reprend le titre');
  ok('publication avec e-mail : un envoi par membre (2)');

  /* Liste publique : plus récente en tête */
  const pub = await H.announcements();
  assert.strictEqual(pub.status, 200);
  assert.strictEqual(pub.body.announcements.length, 2);
  assert.strictEqual(pub.body.announcements[0].title, 'Nouveau cours', 'ordre antéchronologique');
  ok('liste publique ordonnée (plus récente en tête)');

  /* Non-lus : au départ notifSeenAt=0, tout est neuf ; après /me/seen, plus rien */
  const me0 = await H.me('Bearer ' + s1.body.token);
  assert.strictEqual(me0.body.notifSeenAt, 0, 'aucune annonce lue au départ');
  const seen = await H.meSeen('Bearer ' + s1.body.token);
  assert.strictEqual(seen.status, 200);
  assert.ok(seen.body.notifSeenAt > 0, 'horodatage « lu » enregistré');
  const list = pub.body.announcements;
  const unread = list.filter(x => x.at > seen.body.notifSeenAt).length;
  assert.strictEqual(unread, 0, 'plus aucune annonce non lue après marquage');
  ok('marquage « lu » synchronisé au compte (multi-appareils)');

  /* meSeen exige une session */
  assert.strictEqual((await H.meSeen('')).status, 401);
  ok('marquage « lu » protégé (401 sans session)');

  console.log(`\n${n}/${n} tests annonces OK ✔`);
})().catch(e => { console.error('✗ ÉCHEC :', e.message, '\n', e.stack); process.exit(1); });
