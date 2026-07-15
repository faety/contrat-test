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

  /* Réservé aux membres : un visiteur non connecté ne voit AUCUNE annonce */
  const anon = await H.announcements('', '');
  assert.strictEqual(anon.status, 401, 'visiteur non connecté → 401');
  assert.deepStrictEqual(anon.body.announcements, [], 'aucune annonce renvoyée à un visiteur');
  ok('annonces réservées : visiteur non connecté → 401, liste vide');

  /* Liste pour un membre connecté (jeton) : plus récente en tête */
  const pub = await H.announcements('Bearer ' + s1.body.token, '');
  assert.strictEqual(pub.status, 200);
  assert.strictEqual(pub.body.announcements.length, 2);
  assert.strictEqual(pub.body.announcements[0].title, 'Nouveau cours', 'ordre antéchronologique');
  ok('membre connecté : liste ordonnée (plus récente en tête)');

  /* L'admin peut aussi lister (clé admin), sans compte membre */
  const asAdmin = await H.announcements('', KEY);
  assert.strictEqual(asAdmin.status, 200);
  assert.strictEqual(asAdmin.body.announcements.length, 2);
  ok('admin : liste accessible via la clé admin');

  /* s1 a été créé AVANT les annonces → il a des non-lus ; après /me/seen, plus rien */
  const list = pub.body.announcements;
  const me0 = await H.me('Bearer ' + s1.body.token);
  const unreadBefore = list.filter(x => x.at > (me0.body.notifSeenAt || 0)).length;
  assert.ok(unreadBefore >= 1, 'membre antérieur : des annonces non lues au départ');
  const seen = await H.meSeen('Bearer ' + s1.body.token);
  assert.strictEqual(seen.status, 200);
  assert.ok(seen.body.notifSeenAt > 0, 'horodatage « lu » enregistré');
  const unreadAfter = list.filter(x => x.at > seen.body.notifSeenAt).length;
  assert.strictEqual(unreadAfter, 0, 'plus aucune annonce non lue après marquage');
  ok('marquage « lu » synchronisé au compte (multi-appareils)');

  /* Un membre qui s'inscrit APRÈS les annonces ne voit pas les anciennes comme non lues */
  const s3 = await H.signup({ prenom: 'Cyr', nom: 'K', whatsapp: '0700000002', email: 'cyr@test.local' });
  const unreadNew = list.filter(x => x.at > (s3.body.notifSeenAt || 0)).length;
  assert.strictEqual(unreadNew, 0, 'nouveau membre : aucune annonce antérieure en non-lu');
  ok('nouveau membre : pas de badge pour les annonces d\'avant son inscription');

  /* meSeen exige une session */
  assert.strictEqual((await H.meSeen('')).status, 401);
  ok('marquage « lu » protégé (401 sans session)');

  console.log(`\n${n}/${n} tests annonces OK ✔`);
})().catch(e => { console.error('✗ ÉCHEC :', e.message, '\n', e.stack); process.exit(1); });
