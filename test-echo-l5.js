/*
  Tests leçon 5 Echo (Kearon, « Au service du Père »).
  Lancer :  NODE_PATH=... node test-echo-l5.js
*/
'use strict';
const PORT=4352; process.env.PORT=String(PORT); delete process.env.DATABASE_URL; delete process.env.WAVE_API_KEY;
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
    if(w.ECHO_LESSONS.l5!==14) throw new Error('ECHO_LESSONS.l5='+w.ECHO_LESSONS.l5);
    ok('référentiel serveur : leçon 5 = 14 parties');

    await p.goto('http://127.0.0.1:'+PORT);
    await p.evaluate(()=>{ S.enrolled.echo={at:Date.now(),paid:true,op:'Wave',ref:'T',expiresAt:Date.now()+30*86400e3}; save(); });
    await p.goto('http://127.0.0.1:'+PORT+'/echo/'); await p.waitForTimeout(500);
    await p.waitForSelector('#lessons .pcard');
    if(await p.locator('#lessons .pcard').count()!==Object.keys(w.ECHO_LESSONS).length) throw new Error('nombre de leçons');
    const t=await p.$eval('#lessons', e=>e.textContent);
    if(!/Au service du Père/.test(t)) throw new Error('leçon 5 absente');
    if(!/14 parties/.test(t)||!/127 phrases/.test(t)) throw new Error('méta: '+t.slice(0,200));
    ok('accueil : leçon 5 listée (14 parties · 127 phrases)');

    await p.locator('#lessons .pcard').nth(4).click();
    await p.waitForSelector('#home .hero');
    const h=await p.$eval('#home', e=>e.textContent);
    if(!/Patrick Kearon/.test(h)||!/Les 14 parties/.test(h)) throw new Error('accueil: '+h.slice(0,180));
    if(!/PK/.test(h)) throw new Error('initiales absentes');
    ok('leçon 5 : 14 parties, orateur Patrick Kearon, initiales PK');

    await p.locator('#home .pcard').first().click();
    await p.waitForSelector('#part .scard');
    if(await p.locator('#part .scard').count()!==10) throw new Error('phrases partie 1');
    const top=await p.$eval('#part .topbar', e=>e.textContent);
    if(!/Partie 1 \/ 14/.test(top)) throw new Error('compteur: '+top);
    const s1=await p.$eval('#part .scard .stext', e=>e.textContent);
    if(!/I was baptised into The Church/.test(s1)) throw new Error('phrase 1: '+s1);
    ok('partie 1 : 10 phrases, « Partie 1 / 14 », texte anglais');

    await p.locator('#part .chip-btn').first().click();
    const fr=await p.$eval('#part .fr-block', e=>e.textContent);
    if(!/Je me suis fait baptiser/.test(fr)) throw new Error('traduction: '+fr.slice(0,120));
    ok('traduction française officielle + vocabulaire');

    const meta=await p.evaluate(()=>{ const L=window.LESSONS[4];
      const last=L.parts.at(-1).sentences.at(-1);
      let prev=0, mono=true;
      for(const pt of L.parts) for(const s of pt.sentences){ if(s.s<prev-0.01||s.e<=s.s) mono=false; prev=s.e; }
      return {end:last.e, mono}; });
    if(meta.end<664||meta.end>669) throw new Error('couverture: '+meta.end);
    if(!meta.mono) throw new Error('timestamps non monotones');
    ok('alignement : couvre ~668 s, timestamps croissants');

    const r=await p.request.get('http://127.0.0.1:'+PORT+'/echo/audio-lesson5.mp3');
    if(r.status()!==200||!/audio\/mpeg/.test(r.headers()['content-type']||'')) throw new Error('audio: '+r.status());
    ok('audio-lesson5.mp3 servi en audio/mpeg');

    if(errs.length) throw new Error('erreurs JS: '+errs.join(' | '));
    ok('aucune erreur JS');
  }catch(e){ ko('leçon 5', e.message); }
  await b.close(); server.close();
  console.log(`\n${pass}/${pass+fail} tests leçon 5 ${fail?'✗':'OK ✔'}`);
  process.exit(fail?1:0);
})().catch(e=>{ console.error('✗ ÉCHEC :', e.message); process.exit(1); });
