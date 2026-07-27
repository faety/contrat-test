/*
  Tests certificats Echo par paliers (3/6/10) + synchronisation de progression.
  Partie 1 : API serveur (mémoire). Partie 2 : UI Echo (Playwright) — up-sync,
  down-sync multi-appareils, félicitations certificat.
  Lancer :  NODE_PATH=... node test-echo-cert.js
*/
'use strict';
const PORT = 4347; process.env.PORT = String(PORT); delete process.env.DATABASE_URL; delete process.env.WAVE_API_KEY;
const assert = require('assert');
const fs = require('fs');
const mail = require('./lib/mail'); mail._setTransport({ sendMail: async () => {} });
const H = require('./lib/handlers'); const store = require('./lib/store'); const w = require('./lib/wave');
const server = require('./server.js');
const { chromium } = require('playwright');
let n = 0; const ok = s => console.log(`  ✓ ${++n}. ${s}`);

/* Crée un compte abonné Echo (paiement mensuel) et renvoie { token, userId }. */
async function subscriber(email, ref) {
  await H.afterPaid(await store.create({ ref, courseId: 'echo-m', amount: 2000, status: 'paid', buyer: { prenom: 'Test', nom: 'Echo', whatsapp: 'x', email } }));
  const sent = []; mail._setTransport({ sendMail: async m => sent.push(m) });
  await H.authRequest({ email });
  const code = sent[sent.length - 1].subject.match(/(\d{6})/)[1];
  const v = await H.authVerify({ email, code });
  assert.strictEqual(v.status, 200);
  const u = await store.userGetByEmail(email);
  return { token: v.body.token, userId: u.id };
}

(async () => {
  console.log('Tests certificats Echo + sync (mémoire)');

  /* ---- 1. Référentiel serveur = contenu réel de echo/data.js ---- */
  const win = {};
  new Function('window', fs.readFileSync('./echo/data.js', 'utf8'))(win);
  const real = {};
  for (const L of win.LESSONS) {
    real[L.id] = L.parts.length;
    L.parts.forEach((p, i) => assert.strictEqual(p.id, `${L.id}p${i + 1}`, `id de partie inattendu: ${p.id}`));
  }
  assert.deepStrictEqual(w.ECHO_LESSONS, real);
  ok(`ECHO_LESSONS conforme à echo/data.js (${Object.entries(real).map(([k, v]) => k + ':' + v).join(', ')})`);

  assert.deepStrictEqual(w.ECHO_CERT_LEVELS.map(l => [l.level, l.lessons]), [[1, 3], [2, 6], [3, 10]]);
  assert.ok(/Niveau 1/.test(w.COURSE_NAMES['echo-n1']) && /Niveau 2/.test(w.COURSE_NAMES['echo-n2']) && /Niveau 3/.test(w.COURSE_NAMES['echo-n3']));
  ok('paliers 3/6/10 et noms publics des certificats Niveau 1/2/3');

  /* ---- 2. meProgress : parties Echo validées contre le référentiel ---- */
  const A = await subscriber('cert-a@x.com', 'KL-EC1');
  const auth = 'Bearer ' + A.token;
  for (let i = 1; i <= w.ECHO_LESSONS.l1; i++) {
    const r = await H.meProgress(auth, { courseId: 'echo', lessonKey: 'l1p' + i });
    assert.strictEqual(r.status, 200, 'l1p' + i);
  }
  ok('les 8 parties de la leçon 1 sont acceptées (l1p1…l1p8)');

  for (const bad of ['l1', 'l1p0', 'l1p9', 'l9p1', 'l1p1x', 'p1']) {
    assert.strictEqual((await H.meProgress(auth, { courseId: 'echo', lessonKey: bad })).status, 400, bad);
  }
  ok('clés inventées refusées (l1, l1p0, l1p9, l9p1…)');

  const B = await subscriber('cert-b@x.com', 'KL-EC2'); // second abonné, aucun progrès
  const noEnr = await H.signup({ email: 'cert-c@x.com', prenom: 'Sans', nom: 'Echo', whatsapp: '0102030405' });
  assert.strictEqual((await H.meProgress('Bearer ' + noEnr.body.token, { courseId: 'echo', lessonKey: 'l1p1' })).status, 403);
  ok('progression Echo refusée sans abonnement (403)');

  /* ---- 3. meCertificate : palier non atteint puis Niveau 1 ---- */
  let r = await H.meCertificate(auth, { courseId: 'echo' });
  assert.strictEqual(r.status, 400);
  assert.deepStrictEqual([r.body.error, r.body.done, r.body.needed], ['palier-non-atteint', 1, 3]);
  ok('1 leçon complète → palier non atteint (done:1, needed:3)');

  for (let i = 1; i <= w.ECHO_LESSONS.l2; i++) await H.meProgress(auth, { courseId: 'echo', lessonKey: 'l2p' + i });
  r = await H.meCertificate(auth, { courseId: 'echo' });
  assert.strictEqual(r.status, 400); assert.strictEqual(r.body.done, 2);
  ok('2 leçons complètes → toujours palier non atteint (Niveau 1 = 3 leçons)');

  /* Termine la leçon 3 (réelle) → palier Niveau 1 atteint. */
  for (let i = 1; i <= w.ECHO_LESSONS.l3; i++) await H.meProgress(auth, { courseId: 'echo', lessonKey: 'l3p' + i });
  r = await H.meCertificate(auth, { courseId: 'echo' });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.certificate.courseId, 'echo-n1');
  assert.strictEqual(r.body.lessonsDone, 3);
  assert.ok(!r.body.certificates.some(c => c.courseId === 'echo-n2'), 'Niveau 2 émis à tort');
  const certId = r.body.certificate.id;
  ok('3 leçons complètes → certificat Niveau 1 émis (et pas le Niveau 2)');

  const r2 = await H.meCertificate(auth, { courseId: 'echo' });
  assert.strictEqual(r2.body.certificate.id, certId);
  ok('idempotent : redemander ne crée pas de doublon (même numéro)');

  const pub = await H.certVerify(certId);
  assert.strictEqual(pub.status, 200);
  assert.ok(pub.body.valid && /Niveau 1/.test(pub.body.courseName));
  ok('vérification publique : certificat authentique, nom « Niveau 1 »');

  assert.strictEqual((await H.meCertificate('Bearer ' + noEnr.body.token, { courseId: 'echo' })).status, 403);
  ok('demande de certificat Echo refusée sans abonnement (403)');

  /* ---- 4. UI : synchronisation dans l'app Echo ---- */
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const far = Date.now() + 30 * 86400e3;

  /* Connexion locale : token + abonnement dans kalan-v1 (même origine). */
  await p.goto(`http://127.0.0.1:${PORT}/`);
  await p.evaluate(([tok, exp]) => {
    localStorage.setItem('kalan-v1', JSON.stringify({ token: tok, enrolled: { echo: { at: Date.now(), paid: true, op: 'Wave', ref: 'KL-EC2', expiresAt: exp } } }));
  }, [B.token, far]);

  /* Up-sync : une partie terminée localement est poussée au serveur. */
  await p.goto(`http://127.0.0.1:${PORT}/echo/`);
  await p.waitForSelector('#lessons .pcard');
  await p.evaluate(async () => {
    const part = window.LESSONS[0].parts[0];
    part.sentences.forEach((_, i) => { const k = part.id + ':' + i; state.completed[k] = true; state.listened[k] = true; state.recorded[k] = true; });
    save();
    await Sync.push();
  });
  await p.waitForTimeout(300);
  let prog = await store.progressByUser(B.userId);
  assert.deepStrictEqual(prog.map(x => x.courseId + ':' + x.lessonKey), ['echo:l1p1']);
  ok('up-sync : partie terminée dans l\'app → enregistrée sur le compte serveur');

  /* Down-sync : une partie validée sur un AUTRE appareil apparaît ici. */
  await store.progressAdd(B.userId, 'echo', 'l1p2');
  await p.reload(); await p.waitForTimeout(600);
  const down = await p.evaluate(() => {
    const part = window.LESSONS[0].parts[1];
    return part.sentences.every((_, i) => state.completed[part.id + ':' + i] && state.listened[part.id + ':' + i]);
  });
  assert.ok(down, 'down-sync absent');
  ok('down-sync : progression d\'un autre appareil rattrapée localement');

  /* Certificat émis côté serveur → félicitations à l'ouverture, une seule fois. */
  await store.certCreate(B.userId, 'echo-n1', 'Test Echo');
  await p.reload(); await p.waitForSelector('.congrats');
  const modal = await p.$eval('.congrats', e => e.textContent);
  assert.ok(/Certificat Niveau 1 obtenu/.test(modal) && /acquis à vie/.test(modal), modal.slice(0, 120));
  ok('nouveau certificat → modale de félicitations « Niveau 1 obtenu »');

  await p.reload(); await p.waitForTimeout(700);
  assert.strictEqual(await p.locator('.congrats').count(), 0);
  ok('déjà félicité → pas de répétition de la modale');

  /* Sans compte connecté : l'app fonctionne, aucune erreur JS. */
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p2 = await ctx2.newPage();
  const errs2 = []; p2.on('pageerror', e => errs2.push(e.message));
  await p2.goto(`http://127.0.0.1:${PORT}/`);
  await p2.evaluate(exp => { localStorage.setItem('kalan-v1', JSON.stringify({ enrolled: { echo: { paid: true, expiresAt: exp } } })); }, far);
  await p2.goto(`http://127.0.0.1:${PORT}/echo/`);
  await p2.waitForSelector('#lessons .pcard'); await p2.waitForTimeout(400);
  assert.deepStrictEqual(errs2, []);
  ok('sans token : app locale intacte, aucune erreur JS');

  assert.deepStrictEqual(errs, []);
  ok('aucune erreur JS sur toute la session connectée');

  await b.close(); server.close();
  console.log(`\n${n}/${n} tests certificats Echo OK ✔`);
  process.exit(0);
})().catch(e => { console.error('✗ ÉCHEC :', e.message, '\n', e.stack); process.exit(1); });
