/*
  Test d'intégration Wave RÉEL (faux serveur Wave) pour les produits sans fiche
  cours classique : abonnement Echo annuel (promo) et Pack IA.
  Reproduit le bug « Connexion au paiement impossible » (payWaveStart plantait
  sur courseById(plan) → undefined). Lancer :  node test-echo-wave.js
*/
'use strict';
const http = require('http');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { chromium } = require('playwright');

const APP_PORT = 4341, WAVE_PORT = 4342;
const APP_URL = `http://127.0.0.1:${APP_PORT}`;
const SECRET = 'whsec_test_echo';
let pass=0, fail=0;
const ok=n=>{pass++;console.log('OK  '+n)}, ko=(n,e)=>{fail++;console.log('FAIL '+n+' :: '+e)};
const signBody=b=>{const t=Math.floor(Date.now()/1000);return `t=${t},v1=${crypto.createHmac('sha256',SECRET).update(`${t}.${b}`).digest('hex')}`;};

const sessions={};
const waveStub=http.createServer((req,res)=>{
  let data=''; req.on('data',c=>data+=c); req.on('end',async()=>{
    const url=new URL(req.url,'http://x');
    if(req.method==='POST'&&url.pathname==='/v1/checkout/sessions'){
      const p=JSON.parse(data); const id='cos-'+crypto.randomBytes(5).toString('hex');
      sessions[p.client_reference]={id,...p,checkout_status:'open',payment_status:'processing'};
      res.writeHead(200,{'Content-Type':'application/json'});
      return res.end(JSON.stringify({id,wave_launch_url:`http://127.0.0.1:${WAVE_PORT}/pay?ref=${p.client_reference}`}));
    }
    if(req.method==='GET'&&url.pathname==='/pay'){
      const ref=url.searchParams.get('ref'); const s=sessions[ref];
      s.checkout_status='complete'; s.payment_status='succeeded'; s.transaction_id='TX-'+ref.slice(-4);
      const body=JSON.stringify({id:'evt-1',type:'checkout.session.completed',data:{id:s.id,client_reference:ref,transaction_id:s.transaction_id,payment_status:'succeeded',checkout_status:'complete'}});
      await fetch(`${APP_URL}/api/wave/webhook`,{method:'POST',headers:{'Content-Type':'application/json','Wave-Signature':signBody(body)},body});
      res.writeHead(302,{Location:s.success_url}); return res.end();
    }
    if(req.method==='GET'&&url.pathname==='/v1/checkout/sessions/search'){
      const ref=url.searchParams.get('client_reference');
      res.writeHead(200,{'Content-Type':'application/json'});
      return res.end(JSON.stringify({result:sessions[ref]?[sessions[ref]]:[]}));
    }
    res.writeHead(404); res.end();
  });
});

(async()=>{
  waveStub.listen(WAVE_PORT);
  /* ECHO_FREE=0 : on teste la machinerie PAYANTE (celle du retour à l'abonnement). */
  const srv=spawn('node',['./server.js'],{env:{...process.env,PORT:String(APP_PORT),APP_URL,ECHO_FREE:'0',WAVE_API_KEY:'wave_ci_test_key',WAVE_WEBHOOK_SECRET:SECRET,WAVE_API_BASE:`http://127.0.0.1:${WAVE_PORT}`},stdio:['ignore','pipe','pipe']});
  await new Promise(r=>setTimeout(r,800));
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const ctx=await b.newContext({viewport:{width:390,height:844}});
  await ctx.addInitScript(()=>{ window.__ECHO_FREE__=false; });
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  try{
    const hp=p.waitForResponse(r=>r.url().includes('/api/health'),{timeout:8000});
    await p.goto(APP_URL); await hp; await p.waitForTimeout(250);
    // compte serveur
    await p.evaluate(async()=>{
      const r=await fetch('/api/signup',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({prenom:'Awa',nom:'K',whatsapp:'0576020058',prefix:'+225',email:'ew'+Date.now()+'@t.local',password:'pass123'})});
      const j=await r.json();
      S.user={prenom:'Awa',nom:'K',whatsapp:'0576020058',email:'ew@t.local',prefix:'+225'}; S.token=j.token; save();
    });
    /* --- Abonnement annuel Echo (promo) via Wave --- */
    await p.evaluate(()=>App.openEcho());
    await p.click('.plancard.best .btn');
    await p.waitForSelector('.op');
    const head=await p.$eval('.qhelp', e=>e.textContent);
    if(!/10\s?000/.test(head.replace(/ | /g,' '))) throw new Error('en-tête sans prix promo: '+head);
    ok('en-tête paiement : prix promo 10 000 F affiché (20 000 barré)');
    await p.click('.op:has-text("Wave")');
    await p.click('.flowfoot .btn');                 // Payer avec Wave → checkout → redirection
    await p.waitForSelector('.bigcheck', {timeout:15000});
    const rec=await p.$eval('#overlay', e=>e.textContent);
    if(!/10\s?000/.test(rec.replace(/ | /g,' '))) throw new Error('reçu sans 10 000: '+rec.slice(0,200));
    ok('paiement Wave réel simulé : session créée, webhook signé, reçu 10 000 F');
    await p.click('.flowfoot .btn');                 // → écran Echo abonné
    await p.waitForSelector('.card:has-text("Abonnement actif")', {timeout:8000});
    const d=await p.evaluate(()=>echoDaysLeft());
    if(d<360||d>370) throw new Error('jours: '+d+' (366 attendu, pas de double crédit)');
    ok('abonnement annuel actif ('+d+' j) après retour de Wave');
    /* --- Pack IA via Wave (même bug latent corrigé) --- */
    await p.evaluate(()=>{ App.tab('cours'); });
    await p.waitForSelector('.freecta:has-text("Pack IA complet") .btn');
    await p.click('.freecta:has-text("Pack IA complet") .btn');
    await p.waitForSelector('.op');
    await p.click('.op:has-text("Wave")');
    await p.click('.flowfoot .btn');
    await p.waitForSelector('.bigcheck', {timeout:15000});
    await p.click('.flowfoot .btn');
    const packOk=await p.evaluate(()=>['chatgpt','claude','copilot'].every(id=>S.enrolled[id]&&S.enrolled[id].paid));
    if(!packOk) throw new Error('pack non débloqué');
    ok('Pack IA payé via Wave : les 3 cours débloqués');
    if(errs.length) throw new Error('JS: '+errs.join(' | '));
    ok('aucune erreur JavaScript');
  }catch(e){ ko('echo/pack Wave', e.message); }
  await b.close(); srv.kill(); waveStub.close();
  console.log(pass+'/'+(pass+fail)+' echo-wave '+(fail?'❌':'OK'));
  process.exit(fail?1:0);
})();
