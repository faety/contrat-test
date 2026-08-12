/*
  Tests leçon 7 Echo (« Voici ce qu'est l'amour » — le ver cramoisi).
  Lancer :  NODE_PATH=... node test-echo-l7.js
*/
'use strict';
const PORT=4360; process.env.PORT=String(PORT); delete process.env.DATABASE_URL; delete process.env.WAVE_API_KEY;
const { chromium } = require('playwright');
const w = require('./lib/wave');
const server = require('./server.js');
let pass=0,fail=0; const ok=n=>{pass++;console.log('OK  '+n)},ko=(n,e)=>{fail++;console.log('FAIL '+n+' :: '+e)};
(async()=>{
  await new Promise(r=>setTimeout(r,400));
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  try{
    if(w.ECHO_LESSONS.l7!==5) throw new Error('ECHO_LESSONS.l7='+w.ECHO_LESSONS.l7);
    ok('référentiel serveur : leçon 7 = 5 parties');

    await p.goto('http://127.0.0.1:'+PORT);
    await p.evaluate(()=>{ S.enrolled.echo={at:Date.now(),paid:true,op:'Wave',ref:'T',expiresAt:Date.now()+30*86400e3}; save(); });
    await p.goto('http://127.0.0.1:'+PORT+'/echo/'); await p.waitForTimeout(500);
    await p.waitForSelector('#lessons .pcard');
    if(await p.locator('#lessons .pcard').count()!==Object.keys(w.ECHO_LESSONS).length) throw new Error('nombre de leçons');
    const t=await p.$eval('#lessons', e=>e.textContent);
    if(!/Voici ce qu'est l'amour/.test(t)) throw new Error('leçon 7 absente');
    if(!/5 parties/.test(t)||!/43 phrases/.test(t)) throw new Error('méta: '+t.slice(0,200));
    ok('accueil : leçon 7 listée (5 parties · 43 phrases)');

    await p.locator('#lessons .pcard').nth(6).click();
    await p.waitForSelector('#home .hero');
    const h=await p.$eval('#home', e=>e.textContent);
    if(!/Les 5 parties/.test(h)||!/Psaume 22/.test(h)) throw new Error('accueil: '+h.slice(0,180));
    if(!/Renny Tan/.test(h)||!/RT/.test(h)) throw new Error('crédit Renny Tan absent');
    if(!/Brooke Ligertwood/.test(h)) throw new Error('crédit Ligertwood absent');
    if(/Intellectual Reserve/.test(h)) throw new Error('mention IRI affichée à tort');
    ok('leçon 7 : 5 parties, Renny Tan (RT), crédit Brooke Ligertwood');

    await p.locator('#home .pcard').first().click();
    await p.waitForSelector('#part .scard');
    if(await p.locator('#part .scard').count()!==10) throw new Error('phrases partie 1');
    const top=await p.$eval('#part .topbar', e=>e.textContent);
    if(!/Partie 1 \/ 5/.test(top)) throw new Error('compteur: '+top);
    const s1=await p.$eval('#part .scard .stext', e=>e.textContent);
    if(!/You know when Jesus hung on the cross/.test(s1)) throw new Error('phrase 1: '+s1);
    ok('partie 1 : 10 phrases, « Partie 1 / 5 », texte anglais');

    await p.locator('#part .chip-btn').first().click();
    const fr=await p.$eval('#part .fr-block', e=>e.textContent);
    if(!/suspendu à la croix/.test(fr)) throw new Error('traduction: '+fr.slice(0,120));
    ok('traduction française + vocabulaire');

    const meta=await p.evaluate(()=>{ const L=window.LESSONS[6];
      const last=L.parts.at(-1).sentences.at(-1);
      let prev=0, mono=true;
      for(const pt of L.parts) for(const s of pt.sentences){ if(s.s<prev-0.01||s.e<=s.s) mono=false; prev=s.e; }
      return {end:last.e, mono, n:L.parts.reduce((a,p)=>a+p.sentences.length,0)}; });
    if(meta.end<176||meta.end>179) throw new Error('couverture: '+meta.end);
    if(!meta.mono||meta.n!==43) throw new Error('timestamps/phrases: '+JSON.stringify(meta));
    ok('alignement : couvre ~178 s, timestamps croissants, 43 phrases');

    const r=await p.request.get('http://127.0.0.1:'+PORT+'/echo/audio-lesson7.mp3');
    if(r.status()!==200||!/audio\/mpeg/.test(r.headers()['content-type']||'')) throw new Error('audio: '+r.status());
    ok('audio-lesson7.mp3 servi en audio/mpeg');

    if(errs.length) throw new Error('erreurs JS: '+errs.join(' | '));
    ok('aucune erreur JS');
  }catch(e){ ko('leçon 7', e.message); }
  await b.close(); server.close();
  console.log(`\n${pass}/${pass+fail} tests leçon 7 ${fail?'✗':'OK ✔'}`);
  process.exit(fail?1:0);
})().catch(e=>{ console.error('✗ ÉCHEC :', e.message); process.exit(1); });
