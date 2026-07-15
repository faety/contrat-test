/*
  Test navigateur du système de notifications / annonces :
   - La cloche est présente dans l'en-tête, sans badge quand rien de neuf.
   - Le sélecteur de publication n'offre PAS « Annonces » (réservé à l'équipe).
   - L'admin publie une annonce (API) → au rechargement, badge sur la cloche,
     annonce visible dans le centre de notifications ET dans le fil communauté,
     puis badge remis à zéro après ouverture (marquage « lu »).
  Serveur EN INTRA-PROCESSUS. Lancer :  node test-notif-ui.js
*/
'use strict';
const PORT = 4322;
const APP_URL = `http://127.0.0.1:${PORT}`;
process.env.PORT = String(PORT);
process.env.APP_URL = APP_URL;
process.env.WAVE_API_KEY = 'wave_ci_test_dummy';
process.env.ADMIN_PASSWORD = 'secret-admin';
delete process.env.DATABASE_URL;

const mail = require('./lib/mail');
mail._setTransport({ sendMail: async () => {} });

const { chromium } = require('playwright');
const server = require('./server.js');

let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log('OK  ' + n); };
const ko = (n, e) => { fail++; console.log('FAIL ' + n + ' :: ' + e); };
const email = `awa${Date.now()}@test.local`;

(async () => {
  await new Promise(r => setTimeout(r, 500));
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));

  const boot = async () => {
    const hp = p.waitForResponse(r => r.url().includes('/api/health'), { timeout: 8000 });
    await p.goto(APP_URL);
    await hp;
    await p.waitForResponse(r => r.url().includes('/api/announcements'), { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(200);
  };

  try {
    /* ---------- Cloche présente, pas de badge au départ ---------- */
    await boot();
    if (!(await p.$('.iconbtn.bell'))) throw new Error('cloche absente de l\'en-tête');
    if (await p.$('.iconbtn.bell .dot')) throw new Error('badge affiché alors qu\'aucune annonce');
    ok('cloche présente dans l\'en-tête, sans badge au départ');

    /* ---------- Crée un compte (pour le marquage « lu » serveur) ---------- */
    await p.click('.ccard:has-text("Comprendre l\'IA")');
    await p.click('.ctabar .btn');
    await p.fill('#finput', 'Awa'); await p.keyboard.press('Enter');
    await p.fill('#finput', 'Kouassi'); await p.keyboard.press('Enter');
    await p.fill('#finput', '0576020058'); await p.keyboard.press('Enter');
    await p.fill('#finput', email); await p.keyboard.press('Enter');
    await p.fill('#finput', 'motdepasse1'); await p.keyboard.press('Enter');
    await p.click('.flowfoot .btn');
    await p.waitForSelector('.bigcheck', { timeout: 8000 });
    await p.click('#overlay .btn');                       // ferme l'écran de bienvenue
    await p.waitForSelector('#overlay', { state: 'detached', timeout: 5000 }).catch(() => {});
    await p.waitForTimeout(150);
    ok('compte membre créé pour le test');

    /* ---------- Le sélecteur de publication n'offre pas « Annonces » ---------- */
    await p.click('.tab:has-text("Communauté")');
    await p.waitForSelector('.compose', { timeout: 5000 });
    await p.click('.compose');
    await p.waitForSelector('.catpick', { timeout: 5000 });
    const cats = await p.$$eval('.catpick .chip', els => els.map(e => e.textContent.trim()));
    if (cats.includes('Annonces')) throw new Error('« Annonces » proposé aux membres : ' + cats.join(', '));
    if (!cats.includes('Général')) throw new Error('catégories membres inattendues : ' + cats.join(', '));
    ok('publication membre : « Annonces » absent du sélecteur (' + cats.join(', ') + ')');

    /* ---------- L'admin publie une annonce (via API protégée) ---------- */
    const res = await fetch(`${APP_URL}/api/admin/announce`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': 'secret-admin' },
      body: JSON.stringify({ title: 'Nouveau cours', body: 'Un **nouveau** cours arrive bientôt. Reste connecté !' }),
    });
    if (res.status !== 200) throw new Error('publication admin refusée : ' + res.status);
    ok('annonce publiée par l\'admin (API protégée)');

    /* ---------- Rechargement : badge sur la cloche ---------- */
    await boot();
    await p.waitForSelector('.iconbtn.bell .dot', { timeout: 6000 });
    const badge = await p.$eval('.iconbtn.bell .dot', e => e.textContent.trim());
    if (badge !== '1') throw new Error('badge attendu « 1 », obtenu « ' + badge + ' »');
    ok('badge « 1 » affiché sur la cloche après publication');

    /* ---------- L'annonce apparaît dans le fil communauté ---------- */
    await p.click('.tab:has-text("Communauté")');
    await p.waitForSelector('.announce', { timeout: 6000 });
    const feedTxt = await p.$eval('.announce', e => e.textContent);
    if (!/Nouveau cours/.test(feedTxt)) throw new Error('annonce absente du fil');
    ok('annonce visible dans le fil communauté (carte officielle)');

    /* ---------- Le centre de notifications l'affiche et remet le badge à zéro ---------- */
    await p.click('.iconbtn.bell');
    await p.waitForSelector('.screen .announce', { timeout: 6000 });
    const notifTxt = await p.$eval('.announce .atitle', e => e.textContent);
    if (!/Nouveau cours/.test(notifTxt)) throw new Error('annonce absente du centre de notifications');
    ok('centre de notifications : annonce affichée');

    await p.waitForTimeout(300);
    if (await p.$('.iconbtn.bell .dot')) throw new Error('badge encore présent après ouverture');
    ok('badge remis à zéro après lecture (marquage « lu »)');

    /* ---------- Persistance serveur du « lu » : /api/me le reflète ---------- */
    const raw = await p.evaluate(() => localStorage.getItem('kalan-v1'));
    const token = JSON.parse(raw).token;
    const me = await (await fetch(`${APP_URL}/api/me`, { headers: { Authorization: 'Bearer ' + token } })).json();
    if (!(me.notifSeenAt > 0)) throw new Error('notifSeenAt non enregistré côté serveur');
    ok('marquage « lu » persisté côté serveur (multi-appareils)');

    if (errs.length) throw new Error('erreurs page : ' + errs.join(' | '));
    ok('aucune erreur JavaScript en console');
  } catch (e) {
    ko('scénario notifications', e.message);
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`\n${pass}/${pass + fail} tests notifications navigateur ${fail ? '❌' : 'OK'}`);
  process.exit(fail ? 1 : 0);
})();
