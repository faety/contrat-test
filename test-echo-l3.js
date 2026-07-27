/*
  Tests leçon 3 Echo (Uchtdorf, « L'expérience du sépulcre vide ») :
  contenu, alignement, traduction, audio servi, référentiel certificats.
  Lancer :  NODE_PATH=... node test-echo-l3.js
*/
'use strict';
const PORT=4349; process.env.PORT=String(PORT); delete process.env.DATABASE_URL; delete process.env.WAVE_API_KEY;
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
    if(w.ECHO_LESSONS.l3!==15) throw new Error('ECHO_LESSONS.l3='+w.ECHO_LESSONS.l3);
    ok('référentiel serveur : leçon 3 = 15 parties (certificat Niveau 1 atteignable)');

    await p.goto('http://127.0.0.1:'+PORT);
    await p.evaluate(()=>{ S.enrolled.echo={at:Date.now(),paid:true,op:'Wave',ref:'T',expiresAt:Date.now()+30*86400e3}; save(); });
    await p.goto('http://127.0.0.1:'+PORT+'/echo/'); await p.waitForTimeout(500);
    await p.waitForSelector('#lessons .pcard');
    const t=await p.$eval('#lessons', e=>e.textContent);
    if(!/L'expérience du sépulcre vide/.test(t)) throw new Error('leçon 3 absente de la liste');
    if(!/15 parties/.test(t)||!/127 phrases/.test(t)) throw new Error('méta leçon 3: '+t.slice(0,200));
    ok('accueil : leçon 3 listée (15 parties · 127 phrases)');

    await p.locator('#lessons .pcard').nth(2).click();
    await p.waitForSelector('#home .hero');
    const h=await p.$eval('#home', e=>e.textContent);
    if(!/Dieter F. Uchtdorf/.test(h)||!/Les 15 parties/.test(h)) throw new Error('accueil leçon 3: '+h.slice(0,180));
    if(!/DU/.test(h)) throw new Error('initiales orateur absentes');
    if(!/Intellectual Reserve/.test(h)) throw new Error('mention copyright absente');
    ok('leçon 3 : 15 parties, orateur, initiales DU, mention de source');

    await p.locator('#home .pcard').first().click();
    await p.waitForSelector('#part .scard');
    const ph=await p.locator('#part .scard').count();
    if(ph!==7) throw new Error('phrases partie 1: '+ph);
    const top=await p.$eval('#part .topbar', e=>e.textContent);
    if(!/Partie 1 \/ 15/.test(top)) throw new Error('compteur partie: '+top);
    const s1=await p.$eval('#part .scard .stext', e=>e.textContent);
    if(!/Nearly 2,000 years ago/.test(s1)) throw new Error('phrase 1: '+s1);
    ok('partie 1 : 7 phrases, « Partie 1 / 15 », texte anglais aligné');

    await p.locator('#part .chip-btn').first().click(); // 👁 Traduction
    const fr=await p.$eval('#part .fr-block', e=>e.textContent);
    if(!/Il y a près de deux mille ans/.test(fr)) throw new Error('traduction: '+fr.slice(0,120));
    if(!/se lever/.test(fr)) throw new Error('vocabulaire absent');
    ok('traduction française officielle + vocabulaire affichés');

    /* Le tout premier extrait démarre APRÈS l'intro parlée (titre + orateur). */
    const s0=await p.evaluate(()=>window.LESSONS[2].parts[0].sentences[0].s);
    if(s0<6||s0>8) throw new Error('début phrase 1: '+s0);
    const cover=await p.evaluate(()=>{ const L=window.LESSONS[2]; const last=L.parts[14].sentences.at(-1); return last.e; });
    if(cover<730||cover>736) throw new Error('couverture: '+cover);
    ok('alignement : démarre à ~6,8 s (après l\'intro), couvre ~735 s');

    const mono=await p.evaluate(()=>{ const L=window.LESSONS[2]; let prev=0,okk=true;
      for(const pt of L.parts) for(const s of pt.sentences){ if(s.s<prev-0.01||s.e<=s.s) okk=false; prev=s.e; } return okk; });
    if(!mono) throw new Error('timestamps non monotones');
    ok('timestamps strictement croissants, aucune phrase vide');

    const r=await p.request.get('http://127.0.0.1:'+PORT+'/echo/audio-lesson3.mp3');
    if(r.status()!==200||!/audio\/mpeg/.test(r.headers()['content-type']||'')) throw new Error('audio: '+r.status());
    ok('audio-lesson3.mp3 servi en audio/mpeg');

    if(errs.length) throw new Error('erreurs JS: '+errs.join(' | '));
    ok('aucune erreur JS');
  }catch(e){ ko('leçon 3', e.message); }
  await b.close(); server.close();
  console.log(`\n${pass}/${pass+fail} tests leçon 3 ${fail?'✗':'OK ✔'}`);
  process.exit(fail?1:0);
})().catch(e=>{ console.error('✗ ÉCHEC :', e.message); process.exit(1); });
