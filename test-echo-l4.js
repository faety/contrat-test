/*
  Tests leçon 4 Echo (Andersen, « Le mariage éternel est un voyage éternel »).
  Lancer :  NODE_PATH=... node test-echo-l4.js
*/
'use strict';
const PORT=4350; process.env.PORT=String(PORT); delete process.env.DATABASE_URL; delete process.env.WAVE_API_KEY;
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
    if(w.ECHO_LESSONS.l4!==16) throw new Error('ECHO_LESSONS.l4='+w.ECHO_LESSONS.l4);
    ok('référentiel serveur : leçon 4 = 16 parties');

    await p.goto('http://127.0.0.1:'+PORT);
    await p.evaluate(()=>{ S.enrolled.echo={at:Date.now(),paid:true,op:'Wave',ref:'T',expiresAt:Date.now()+30*86400e3}; save(); });
    await p.goto('http://127.0.0.1:'+PORT+'/echo/'); await p.waitForTimeout(500);
    await p.waitForSelector('#lessons .pcard');
    const n=await p.locator('#lessons .pcard').count();
    if(n!==Object.keys(w.ECHO_LESSONS).length) throw new Error('leçons: '+n);
    const t=await p.$eval('#lessons', e=>e.textContent);
    if(!/Le mariage éternel est un voyage éternel/.test(t)) throw new Error('leçon 4 absente');
    if(!/16 parties/.test(t)||!/128 phrases/.test(t)) throw new Error('méta: '+t.slice(0,200));
    ok('accueil : leçon 4 listée (16 parties · 128 phrases)');

    await p.locator('#lessons .pcard').nth(3).click();
    await p.waitForSelector('#home .hero');
    const h=await p.$eval('#home', e=>e.textContent);
    if(!/Neil L. Andersen/.test(h)||!/Les 16 parties/.test(h)) throw new Error('accueil: '+h.slice(0,180));
    if(!/NA/.test(h)) throw new Error('initiales absentes');
    ok('leçon 4 : 16 parties, orateur Neil L. Andersen, initiales NA');

    await p.locator('#home .pcard').first().click();
    await p.waitForSelector('#part .scard');
    if(await p.locator('#part .scard').count()!==6) throw new Error('phrases partie 1');
    const top=await p.$eval('#part .topbar', e=>e.textContent);
    if(!/Partie 1 \/ 16/.test(top)) throw new Error('compteur: '+top);
    const s1=await p.$eval('#part .scard .stext', e=>e.textContent);
    if(!/Following the Savior's incomparable love/.test(s1)) throw new Error('phrase 1: '+s1);
    ok('partie 1 : 6 phrases, « Partie 1 / 16 », texte anglais');

    await p.locator('#part .chip-btn').first().click();
    const fr=await p.$eval('#part .fr-block', e=>e.textContent);
    if(!/Gethsémané/.test(fr)||!/sacrifice/.test(fr)) throw new Error('traduction: '+fr.slice(0,120));
    ok('traduction française + vocabulaire');

    /* Démarre après l'annonce parlée (titre + orateur ≈ 7 s), couvre ~689 s. */
    const meta=await p.evaluate(()=>{ const L=window.LESSONS[3];
      const first=L.parts[0].sentences[0], last=L.parts[15].sentences.at(-1);
      let prev=0, mono=true;
      for(const pt of L.parts) for(const s of pt.sentences){ if(s.s<prev-0.01||s.e<=s.s) mono=false; prev=s.e; }
      return {s0:first.s, end:last.e, mono}; });
    if(meta.s0<6.5||meta.s0>8) throw new Error('début: '+meta.s0);
    if(meta.end<685||meta.end>690) throw new Error('fin: '+meta.end);
    if(!meta.mono) throw new Error('timestamps non monotones');
    ok('alignement : démarre à ~7,2 s, couvre ~689 s, timestamps croissants');

    const r=await p.request.get('http://127.0.0.1:'+PORT+'/echo/audio-lesson4.mp3');
    if(r.status()!==200||!/audio\/mpeg/.test(r.headers()['content-type']||'')) throw new Error('audio: '+r.status());
    ok('audio-lesson4.mp3 servi en audio/mpeg');

    if(errs.length) throw new Error('erreurs JS: '+errs.join(' | '));
    ok('aucune erreur JS');
  }catch(e){ ko('leçon 4', e.message); }
  await b.close(); server.close();
  console.log(`\n${pass}/${pass+fail} tests leçon 4 ${fail?'✗':'OK ✔'}`);
  process.exit(fail?1:0);
})().catch(e=>{ console.error('✗ ÉCHEC :', e.message); process.exit(1); });
