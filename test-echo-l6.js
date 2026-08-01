/*
  Tests leçon 6 Echo (Renny Tan, « L'impala et le lion » — leçon express).
  Lancer :  NODE_PATH=... node test-echo-l6.js
*/
'use strict';
const PORT=4359; process.env.PORT=String(PORT); delete process.env.DATABASE_URL; delete process.env.WAVE_API_KEY;
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
    if(w.ECHO_LESSONS.l6!==3) throw new Error('ECHO_LESSONS.l6='+w.ECHO_LESSONS.l6);
    ok('référentiel serveur : leçon 6 = 3 parties (leçon express)');

    await p.goto('http://127.0.0.1:'+PORT);
    await p.evaluate(()=>{ S.enrolled.echo={at:Date.now(),paid:true,op:'Wave',ref:'T',expiresAt:Date.now()+30*86400e3}; save(); });
    await p.goto('http://127.0.0.1:'+PORT+'/echo/'); await p.waitForTimeout(500);
    await p.waitForSelector('#lessons .pcard');
    if(await p.locator('#lessons .pcard').count()!==Object.keys(w.ECHO_LESSONS).length) throw new Error('nombre de leçons');
    const t=await p.$eval('#lessons', e=>e.textContent);
    if(!/L'impala et le lion/.test(t)) throw new Error('leçon 6 absente');
    if(!/3 parties/.test(t)||!/33 phrases/.test(t)) throw new Error('méta: '+t.slice(0,200));
    ok('accueil : leçon 6 listée (3 parties · 33 phrases)');

    await p.locator('#lessons .pcard').nth(5).click();
    await p.waitForSelector('#home .hero');
    const h=await p.$eval('#home', e=>e.textContent);
    if(!/Renny Tan/.test(h)||!/Les 3 parties/.test(h)) throw new Error('accueil: '+h.slice(0,180));
    if(!/RT/.test(h)) throw new Error('initiales absentes');
    if(!/Renny Tan\. Utilisé à des fins pédagogiques/.test(h)) throw new Error('mention de source propre à la leçon absente');
    if(/Intellectual Reserve/.test(h)) throw new Error('mention Intellectual Reserve affichée à tort');
    ok('leçon 6 : orateur Renny Tan, initiales RT, mention de source dédiée');

    /* Leçon 1 : la mention Intellectual Reserve reste (contenu de l\'Église) */
    await p.evaluate(()=>{ goLessons(); });
    await p.locator('#lessons .pcard').first().click();
    const h1=await p.$eval('#home', e=>e.textContent);
    if(!/Intellectual Reserve/.test(h1)) throw new Error('mention IRI perdue sur la leçon 1');
    ok('leçon 1 : mention © Intellectual Reserve conservée');

    await p.evaluate(()=>{ goLessons(); });
    await p.locator('#lessons .pcard').nth(5).click();
    await p.locator('#home .pcard').first().click();
    await p.waitForSelector('#part .scard');
    if(await p.locator('#part .scard').count()!==12) throw new Error('phrases partie 1');
    const top=await p.$eval('#part .topbar', e=>e.textContent);
    if(!/Partie 1 \/ 3/.test(top)) throw new Error('compteur: '+top);
    const s1=await p.$eval('#part .scard .stext', e=>e.textContent);
    if(!/I heard this story/.test(s1)) throw new Error('phrase 1: '+s1);
    ok('partie 1 : 12 phrases, « Partie 1 / 3 », texte anglais');

    await p.locator('#part .chip-btn').first().click();
    const fr=await p.$eval('#part .fr-block', e=>e.textContent);
    if(!/Sheila Walsh/.test(fr)||!/animatrice/.test(fr)) throw new Error('traduction: '+fr.slice(0,120));
    ok('traduction française + vocabulaire');

    const meta=await p.evaluate(()=>{ const L=window.LESSONS[5];
      const last=L.parts.at(-1).sentences.at(-1);
      let prev=0, mono=true;
      for(const pt of L.parts) for(const s of pt.sentences){ if(s.s<prev-0.01||s.e<=s.s) mono=false; prev=s.e; }
      return {end:last.e, mono, n:L.parts.reduce((a,p)=>a+p.sentences.length,0)}; });
    if(meta.end<134||meta.end>137) throw new Error('couverture: '+meta.end);
    if(!meta.mono||meta.n!==33) throw new Error('timestamps/phrases: '+JSON.stringify(meta));
    ok('alignement : couvre ~136 s, timestamps croissants, 33 phrases');

    const r=await p.request.get('http://127.0.0.1:'+PORT+'/echo/audio-lesson6.mp3');
    if(r.status()!==200||!/audio\/mpeg/.test(r.headers()['content-type']||'')) throw new Error('audio: '+r.status());
    ok('audio-lesson6.mp3 servi en audio/mpeg');

    if(errs.length) throw new Error('erreurs JS: '+errs.join(' | '));
    ok('aucune erreur JS');
  }catch(e){ ko('leçon 6', e.message); }
  await b.close(); server.close();
  console.log(`\n${pass}/${pass+fail} tests leçon 6 ${fail?'✗':'OK ✔'}`);
  process.exit(fail?1:0);
})().catch(e=>{ console.error('✗ ÉCHEC :', e.message); process.exit(1); });
