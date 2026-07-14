/* Test d'intégration Wave : server.js + faux serveur API Wave local + parcours navigateur complet. */
const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const APP_PORT = 4310, WAVE_PORT = 4311;
const APP_URL = `http://127.0.0.1:${APP_PORT}`;
const SECRET = 'whsec_test_123';
let results = [];
const ok = (n) => { results.push('OK  ' + n); console.log('OK  ' + n); };
const fail = (n, e) => { results.push('FAIL ' + n); console.log('FAIL ' + n + ' :: ' + e); };

function signBody(body) {
  const t = Math.floor(Date.now() / 1000);
  const v1 = crypto.createHmac('sha256', SECRET).update(`${t}.${body}`).digest('hex');
  return `t=${t},v1=${v1}`;
}

/* --- Faux serveur Wave : crée des sessions, page de paiement fictive, webhook signé --- */
const sessions = {};
const waveStub = http.createServer((req, res) => {
  let data = '';
  req.on('data', c => data += c);
  req.on('end', async () => {
    const url = new URL(req.url, `http://x`);
    if (req.method === 'POST' && url.pathname === '/v1/checkout/sessions') {
      const p = JSON.parse(data);
      const id = 'cos-' + crypto.randomBytes(5).toString('hex');
      sessions[p.client_reference] = { id, ...p, checkout_status: 'open', payment_status: 'processing' };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ id, wave_launch_url: `http://127.0.0.1:${WAVE_PORT}/pay?ref=${p.client_reference}`, checkout_status: 'open', payment_status: 'processing' }));
    }
    if (req.method === 'GET' && url.pathname === '/pay') {
      // Page « Wave » fictive : marque payé, envoie le webhook signé, puis redirige vers success_url
      const ref = url.searchParams.get('ref');
      const s = sessions[ref];
      s.checkout_status = 'complete'; s.payment_status = 'succeeded'; s.transaction_id = 'TX-' + ref.slice(-4);
      const body = JSON.stringify({ id: 'evt-1', type: 'checkout.session.completed', data: { id: s.id, client_reference: ref, transaction_id: s.transaction_id, payment_status: 'succeeded', checkout_status: 'complete' } });
      await fetch(`${APP_URL}/api/wave/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Wave-Signature': signBody(body) }, body });
      res.writeHead(302, { Location: s.success_url });
      return res.end();
    }
    if (req.method === 'GET' && url.pathname === '/v1/checkout/sessions/search') {
      const ref = url.searchParams.get('client_reference');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ result: sessions[ref] ? [sessions[ref]] : [] }));
    }
    res.writeHead(404); res.end();
  });
});

(async () => {
  waveStub.listen(WAVE_PORT);
  const srv = spawn('node', ['/home/user/contrat-test/server.js'], {
    env: { ...process.env, PORT: String(APP_PORT), APP_URL, WAVE_API_KEY: 'wave_ci_test_key', WAVE_WEBHOOK_SECRET: SECRET, WAVE_API_BASE: `http://127.0.0.1:${WAVE_PORT}` },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  srv.stdout.on('data', d => process.stdout.write('  [srv] ' + d));
  await new Promise(r => setTimeout(r, 800));

  /* --- Tests API --- */
  try {
    const h = await (await fetch(`${APP_URL}/api/health`)).json();
    if (h.ok && h.wave && !h.demo) ok('health : mode réel détecté'); else throw new Error(JSON.stringify(h));
  } catch (e) { fail('health', e.message); }

  let ref;
  try {
    const r = await fetch(`${APP_URL}/api/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseId: 'chatgpt', prenom: 'Awa', nom: 'Kouassi', whatsapp: '+2250700123456', email: 'awa@test.com' }) });
    const j = await r.json();
    if (r.ok && j.ref && j.wave_launch_url.includes('/pay?ref=')) { ref = j.ref; ok('checkout : session créée (montant serveur, launch_url)'); }
    else throw new Error(JSON.stringify(j));
  } catch (e) { fail('checkout', e.message); }

  try {
    const r = await fetch(`${APP_URL}/api/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseId: 'inexistant', prenom: 'A', nom: 'B', whatsapp: 'x', email: 'y' }) });
    if (r.status === 400) ok('checkout : cours inconnu refusé'); else throw new Error('status=' + r.status);
  } catch (e) { fail('checkout refus', e.message); }

  try {
    const body = JSON.stringify({ type: 'checkout.session.completed', data: { client_reference: ref } });
    const r = await fetch(`${APP_URL}/api/wave/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Wave-Signature': 't=1,v1=mauvaise' }, body });
    const j = await r.json();
    const o = await (await fetch(`${APP_URL}/api/order?ref=${ref}`)).json();
    // 200 accepté, mais NON confirmé (verified:false) et commande NON payée (le paiement n'a pas eu lieu)
    if (r.status === 200 && j.verified === false && o.status !== 'paid') ok('webhook non signé : accepté mais non confirmé (pas de faux paiement)');
    else throw new Error('status=' + r.status + ' verified=' + j.verified + ' order=' + o.status);
  } catch (e) { fail('webhook non signé', e.message); }

  try {
    const body = JSON.stringify({ type: 'checkout.session.completed', data: { id: 'cos-x', client_reference: ref, transaction_id: 'TX-999' } });
    const r = await fetch(`${APP_URL}/api/wave/webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Wave-Signature': signBody(body) }, body });
    const j = await (await fetch(`${APP_URL}/api/order?ref=${ref}`)).json();
    if (r.status === 200 && j.status === 'paid' && j.transactionId === 'TX-999') ok('webhook signé : commande payée + transaction');
    else throw new Error(JSON.stringify(j));
  } catch (e) { fail('webhook accepté', e.message); }

  /* --- Parcours navigateur complet (Tally → Wave fictif → retour → accès au cours) --- */
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    await page.goto(APP_URL);
    await page.waitForSelector('.ccard');
    await page.click('.ccard:has-text("ChatGPT")');
    await page.click('.ctabar .btn');
    await page.fill('#finput', 'Awa'); await page.keyboard.press('Enter');
    await page.fill('#finput', 'Kouassi'); await page.keyboard.press('Enter');
    await page.fill('#finput', '0700123456'); await page.keyboard.press('Enter');
    await page.fill('#finput', 'awa@test.com'); await page.keyboard.press('Enter');
    await page.click('.flowfoot .btn'); // confirmer inscription -> paiement
    await page.waitForSelector('.ops');
    const soon = await page.locator('.op.soon').count();
    if (soon !== 3) throw new Error('opérateurs "bientôt" = ' + soon);
    const label = await page.locator('.flowfoot .btn').textContent();
    await page.click('.op:has-text("Wave")');
    if (!(await page.locator('.flowfoot .btn').textContent()).includes('Payer avec Wave')) throw new Error('label bouton: ' + label);
    ok('navigateur : mode réel affiché (Wave seul actif, bouton « Payer avec Wave »)');
  } catch (e) { fail('navigateur mode réel', e.message); }

  try {
    await page.click('.flowfoot .btn'); // Payer avec Wave -> redirection stub -> retour success
    await page.waitForSelector('.receipt', { timeout: 15000 });
    const t = await page.locator('.receipt').textContent();
    if (!t.includes('Transaction Wave')) throw new Error('transaction absente du reçu');
    ok('navigateur : redirection Wave + retour + reçu réel avec transaction');
    await page.click('.flowfoot .btn'); // commencer le cours
    await page.waitForSelector('.pbar');
    ok('navigateur : accès au cours débloqué après paiement');
  } catch (e) { fail('navigateur paiement complet', e.message); }

  try {
    await page.reload(); await page.waitForSelector('.ccard');
    await page.click('.tab:has-text("Mes cours")');
    await page.waitForSelector('.mccard:has-text("ChatGPT")');
    ok('navigateur : inscription persistée après rechargement');
  } catch (e) { fail('persistance', e.message); }

  /* --- Cas mobile réel : retour sur success_url PENDANT que la commande est encore
         en attente (webhook pas encore reçu / autre navigateur type Safari, sans état
         local). Le paiement se confirme ensuite côté serveur, et l'app doit afficher le
         succès AU RETOUR DANS L'APP (événement focus/visibility) SANS rechargement. --- */
  try {
    const r = await fetch(`${APP_URL}/api/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ courseId: 'claude', prenom: 'Fanta', nom: 'Traore', whatsapp: '+2250700998877', email: 'fanta@test.com' }) });
    const ref2 = (await r.json()).ref;
    // Contexte neuf = navigateur différent (Safari) : aucun état local, seulement ?ref dans l'URL.
    const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page2 = await ctx2.newPage();
    const err2 = []; page2.on('pageerror', e => err2.push(e.message));
    await page2.goto(`${APP_URL}/?wave=success&ref=${ref2}`);
    await page2.waitForSelector('.paywait', { timeout: 8000 }); // écran « Confirmation du paiement… »
    // La commande n'est pas encore payée : on ne doit pas déjà voir le reçu.
    if (await page2.locator('.receipt').count() !== 0) throw new Error('reçu affiché avant confirmation');
    // Le paiement se confirme maintenant côté serveur (Wave envoie le webhook signé).
    await fetch(`http://127.0.0.1:${WAVE_PORT}/pay?ref=${ref2}`);
    // Retour dans l'app : événements focus/visibility -> revérification immédiate.
    await page2.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus')); });
    await page2.waitForSelector('.receipt', { timeout: 8000 });
    if (err2.length) throw new Error('JS: ' + err2.join(' | '));
    ok('navigateur : retour pendant « en attente » → succès affiché au focus, sans rechargement');
    await ctx2.close();
  } catch (e) { fail('reprise au focus (cas mobile)', e.message); }

  console.log(errors.length ? 'ERREURS JS: ' + errors.join(' | ') : 'Aucune erreur JS navigateur.');
  await browser.close();
  srv.kill(); waveStub.close();
  const failed = results.filter(r => r.startsWith('FAIL')).length;
  console.log(`\n${results.length - failed}/${results.length} tests Wave OK`);
  process.exit(failed ? 1 : 0);
})();
