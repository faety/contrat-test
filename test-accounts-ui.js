/*
  Test navigateur multi-appareil des comptes serveur :
   - Appareil A : création de compte via l'app + inscription à un cours gratuit.
   - Appareil B (navigateur vierge) : connexion par e-mail + code → retrouve le cours.
  Serveur lancé EN INTRA-PROCESSUS pour capturer le code envoyé par e-mail.
  Lancer :  node test-accounts-ui.js
*/
'use strict';
const PORT = 4320;
const APP_URL = `http://127.0.0.1:${PORT}`;
process.env.PORT = String(PORT);
process.env.APP_URL = APP_URL;
process.env.WAVE_API_KEY = 'wave_ci_test_dummy';      // mode « réel » côté front (pas de paiement ici)
process.env.WAVE_WEBHOOK_SECRET = 'whsec_test';
delete process.env.DATABASE_URL;                       // stockage mémoire

const mail = require('./lib/mail');
const sent = [];
mail._setTransport({ sendMail: async (o) => { sent.push(o); } });
const codeFor = (email) => {
  for (let i = sent.length - 1; i >= 0; i--) { const m = sent[i]; if (m.to === email && /code/i.test(m.subject)) { const g = m.subject.match(/(\d{6})/); if (g) return g[1]; } }
  return null;
};

const { chromium } = require('playwright');
const server = require('./server.js');

let pass = 0, fail = 0;
const ok = (n) => { pass++; console.log('OK  ' + n); };
const ko = (n, e) => { fail++; console.log('FAIL ' + n + ' :: ' + e); };
const email = `awa${Date.now()}@test.local`;

(async () => {
  await new Promise(r => setTimeout(r, 500));
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  /* ---------- Appareil A : création de compte + cours gratuit ---------- */
  let token;
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    const hp = p.waitForResponse(r => r.url().includes('/api/health'), { timeout: 8000 });
    await p.goto(APP_URL);
    await hp; await p.waitForTimeout(150);
    await p.click('.ccard:has-text("Comprendre l\'IA")');
    await p.click('.ctabar .btn');                       // « S'inscrire » (gratuit) → Tally
    await p.fill('#finput', 'Awa'); await p.keyboard.press('Enter');
    await p.fill('#finput', 'Kouassi'); await p.keyboard.press('Enter');
    await p.fill('#finput', '0576020058'); await p.keyboard.press('Enter');
    await p.fill('#finput', email); await p.keyboard.press('Enter');
    await p.click('.flowfoot .btn');                     // confirmer le récap → création compte serveur
    await p.waitForSelector('.bigcheck', { timeout: 8000 }); // écran de bienvenue
    ok('appareil A : compte créé via l\'app (écran de bienvenue)');
    const raw = await p.evaluate(() => localStorage.getItem('kalan-v1'));
    token = JSON.parse(raw).token;
    if (!token) throw new Error('jeton absent du localStorage');
    ok('appareil A : jeton de session stocké localement');
    // Vérifie côté serveur que le compte + l'inscription existent
    const me = await (await fetch(`${APP_URL}/api/me`, { headers: { Authorization: 'Bearer ' + token } })).json();
    if (!(me.user && me.user.email === email)) throw new Error('me.user incorrect');
    if (!me.enrollments.some(x => x.courseId === 'ia')) throw new Error('cours ia non inscrit côté serveur');
    ok('appareil A : compte + inscription « ia » persistés côté serveur');
    if (errs.length) throw new Error('JS A: ' + errs.join(' | '));
    await ctx.close();
  } catch (e) { ko('appareil A', e.message); }

  /* ---------- Appareil B : navigateur vierge, connexion par code ---------- */
  try {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    const hp = p.waitForResponse(r => r.url().includes('/api/health'), { timeout: 8000 });
    await p.goto(APP_URL);
    await hp; await p.waitForTimeout(150);
    // Pas de cours au départ (compte vierge)
    await p.click('.tab:has-text("Mes cours")');
    if (await p.locator('.mccard').count() !== 0) throw new Error('des cours apparaissent sur un appareil vierge');
    ok('appareil B : aucun cours avant connexion');
    // Connexion
    await p.click('.tab:has-text("Profil")');
    await p.click('.btn:has-text("me connecter")');
    await p.waitForSelector('#finput');
    await p.fill('#finput', email);
    await p.click('.btn:has-text("Recevoir mon code")');
    await p.waitForSelector('.qlabel:has-text("Entre ton code")', { timeout: 8000 });
    const code = codeFor(email);
    if (!/^\d{6}$/.test(code || '')) throw new Error('code non capturé');
    ok('appareil B : code de connexion reçu par e-mail');
    await p.fill('#finput', code);
    await p.click('.btn:has-text("Valider")');
    // Après connexion, le cours doit apparaître dans « Mes cours »
    await p.waitForSelector('.overlay .flow', { state: 'detached', timeout: 8000 }).catch(() => {});
    await p.click('.tab:has-text("Mes cours")');
    await p.waitForSelector('.mccard:has-text("Comprendre l\'IA")', { timeout: 8000 });
    ok('appareil B : connexion par code → cours retrouvé dans « Mes cours »');
    // Profil : e-mail et numéro international corrects
    await p.click('.tab:has-text("Profil")');
    await p.waitForSelector('.pcard');
    const wa = await p.locator('.prow:has-text("WhatsApp") .val').innerText();
    if (wa !== '+2250576020058') throw new Error('numéro affiché: ' + wa);
    ok('appareil B : profil rétabli (numéro international +2250576020058)');
    if (errs.length) throw new Error('JS B: ' + errs.join(' | '));
    await ctx.close();
  } catch (e) { ko('appareil B', e.message); }

  await browser.close();
  server.close();
  console.log(`\n${pass}/${pass + fail} tests comptes navigateur OK`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('ER066', e.message, e.stack); process.exit(1); });
