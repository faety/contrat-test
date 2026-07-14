/* Teste le système de coupons côté serveur : preview, checkout avec coupon (montant serveur),
   endpoints admin (auth, save, delete). Faux serveur Wave local. Store mémoire. */
const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');

const APP_PORT = 4320, WAVE_PORT = 4321;
const APP = `http://127.0.0.1:${APP_PORT}`;
const SECRET = 'whsec_test', ADMIN = 'motdepasse-admin';
let pass = 0, fail = 0;
const ok = n => { pass++; console.log('OK  ' + n); };
const ko = (n, e) => { fail++; console.log('FAIL ' + n + ' :: ' + e); };

const sessions = {};
const waveStub = http.createServer((req, res) => {
  let d = ''; req.on('data', c => d += c); req.on('end', () => {
    const u = new URL(req.url, 'http://x');
    if (req.method === 'POST' && u.pathname === '/v1/checkout/sessions') {
      const p = JSON.parse(d); const id = 'cos-' + crypto.randomBytes(4).toString('hex');
      sessions[p.client_reference] = { id, ...p };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ id, wave_launch_url: `http://x/pay?ref=${p.client_reference}` }));
    }
    res.writeHead(404); res.end('{}');
  });
});

const jf = async (path, opt = {}) => {
  const r = await fetch(APP + path, opt);
  let j = {}; try { j = await r.json(); } catch (e) {}
  return { status: r.status, j };
};

(async () => {
  waveStub.listen(WAVE_PORT);
  const srv = spawn('node', ['/home/user/contrat-test/server.js'], {
    env: { ...process.env, PORT: String(APP_PORT), APP_URL: APP, WAVE_API_KEY: 'k',
      WAVE_WEBHOOK_SECRET: SECRET, WAVE_API_BASE: `http://127.0.0.1:${WAVE_PORT}`, ADMIN_PASSWORD: ADMIN },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  srv.stderr.on('data', d => process.stderr.write('[srv] ' + d));
  await new Promise(r => setTimeout(r, 700));

  // 1. health montre admin actif
  try { const {j}=await jf('/api/health'); if(j.admin===true && j.wave===true) ok('health: admin + wave actifs'); else throw new Error(JSON.stringify(j)); }
  catch(e){ ko('health', e.message); }

  // 2. preview CADEAU200 sur ChatGPT (5000) -> 200
  try {
    const {j} = await jf('/api/coupon', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({courseId:'chatgpt',code:'cadeau200'})});
    if(j.valid && j.amount===200 && j.original===5000) ok('preview CADEAU200 -> 200 F (insensible à la casse)');
    else throw new Error(JSON.stringify(j));
  } catch(e){ ko('preview CADEAU200', e.message); }

  // 3. preview code inconnu -> invalide
  try { const {j}=await jf('/api/coupon',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({courseId:'chatgpt',code:'BIDON'})});
    if(j.valid===false) ok('preview code inconnu -> invalide'); else throw new Error(JSON.stringify(j)); }
  catch(e){ ko('preview inconnu', e.message); }

  // 4. checkout avec CADEAU200 -> session Wave à 200 (montant serveur)
  let ref;
  try {
    const {j} = await jf('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({courseId:'chatgpt',code:'CADEAU200',prenom:'Awa',nom:'K',whatsapp:'+2250700000000',email:'a@b.com'})});
    ref=j.ref;
    if(j.amount===200 && sessions[ref] && sessions[ref].amount==='200' && sessions[ref].currency==='XOF') ok('checkout CADEAU200 -> Wave facturé 200 F');
    else throw new Error(JSON.stringify(j)+' / session='+JSON.stringify(sessions[ref]));
  } catch(e){ ko('checkout coupon', e.message); }

  // 5. checkout SANS coupon -> 5000 (le prix normal reste appliqué)
  try {
    const {j}=await jf('/api/checkout',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({courseId:'chatgpt',prenom:'A',nom:'B',whatsapp:'+2250700000000',email:'a@b.com'})});
    if(j.amount===5000 && sessions[j.ref].amount==='5000') ok('checkout sans coupon -> 5000 F'); else throw new Error(JSON.stringify(j));
  } catch(e){ ko('checkout sans coupon', e.message); }

  // 6. admin sans clé -> 401
  try { const {status}=await jf('/api/admin/coupons'); if(status===401) ok('admin sans clé -> 401'); else throw new Error('status='+status); }
  catch(e){ ko('admin 401', e.message); }

  // 7. admin liste avec clé -> contient CADEAU200
  try {
    const {status,j}=await jf('/api/admin/coupons',{headers:{'x-admin-key':ADMIN}});
    if(status===200 && j.coupons.some(c=>c.code==='CADEAU200')) ok('admin liste (auth) contient CADEAU200'); else throw new Error(status+' '+JSON.stringify(j));
  } catch(e){ ko('admin liste', e.message); }

  // 8. admin crée un coupon pourcentage puis preview l'applique
  try {
    const {status}=await jf('/api/admin/coupons',{method:'POST',headers:{'Content-Type':'application/json','x-admin-key':ADMIN},
      body:JSON.stringify({action:'save',coupon:{code:'PROMO50',type:'percent',value:50,active:true,label:'Moitié prix'}})});
    const {j}=await jf('/api/coupon',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({courseId:'chatgpt',code:'PROMO50'})});
    if(status===200 && j.valid && j.amount===2500) ok('admin crée PROMO50 (-50%) -> 2500 F'); else throw new Error(status+' '+JSON.stringify(j));
  } catch(e){ ko('admin save percent', e.message); }

  // 9. coupon désactivé -> non appliqué
  try {
    await jf('/api/admin/coupons',{method:'POST',headers:{'Content-Type':'application/json','x-admin-key':ADMIN},
      body:JSON.stringify({action:'save',coupon:{code:'PROMO50',type:'percent',value:50,active:false}})});
    const {j}=await jf('/api/coupon',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({courseId:'chatgpt',code:'PROMO50'})});
    if(j.valid===false) ok('coupon désactivé -> non valide'); else throw new Error(JSON.stringify(j));
  } catch(e){ ko('coupon désactivé', e.message); }

  // 10. admin supprime -> disparaît de la liste
  try {
    const {j}=await jf('/api/admin/coupons',{method:'POST',headers:{'Content-Type':'application/json','x-admin-key':ADMIN},body:JSON.stringify({action:'delete',code:'PROMO50'})});
    if(!j.coupons.some(c=>c.code==='PROMO50')) ok('admin supprime PROMO50'); else throw new Error(JSON.stringify(j));
  } catch(e){ ko('admin delete', e.message); }

  srv.kill(); waveStub.close();
  console.log(`\n${pass}/${pass+fail} tests coupons OK`);
  process.exit(fail?1:0);
})();
