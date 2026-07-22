'use strict';
const PORT=4345; process.env.PORT=String(PORT); delete process.env.DATABASE_URL; delete process.env.WAVE_API_KEY;
const { chromium } = require('playwright');
const server = require('./server.js');
let pass=0,fail=0; const ok=n=>{pass++;console.log('OK  '+n)},ko=(n,e)=>{fail++;console.log('FAIL '+n+' :: '+e)};
(async()=>{
  await new Promise(r=>setTimeout(r,400));
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  try{
    await p.goto('http://127.0.0.1:'+PORT);
    await p.evaluate(()=>{ S.enrolled.echo={at:Date.now(),paid:true,op:'Wave',ref:'T',expiresAt:Date.now()+30*86400e3}; save(); });
    await p.goto('http://127.0.0.1:'+PORT+'/echo/'); await p.waitForTimeout(500);
    /* Liste des leçons affichée (2 leçons) */
    await p.waitForSelector('#lessons .pcard');
    const n=await p.locator('#lessons .pcard').count();
    if(n!==2) throw new Error('leçons listées: '+n);
    const t=await p.$eval('#lessons', e=>e.textContent);
    if(!/Servir : comme je vous ai aimés/.test(t)) throw new Error('leçon 2 absente');
    if(!/toutes les leçons/i.test(t)) throw new Error('mention « toutes les leçons » absente');
    ok('accueil : 2 leçons listées + « toutes les leçons incluses »');
    /* Ouvre leçon 2 */
    await p.locator('#lessons .pcard').nth(1).click();
    await p.waitForSelector('#home .hero');
    const h=await p.$eval('#home', e=>e.textContent);
    if(!/Kristin M. Yee/.test(h)||!/Les 11 parties/.test(h)) throw new Error('accueil leçon 2: '+h.slice(0,150));
    if(!/KY/.test(h)) throw new Error('initiales oratrice absentes');
    ok('leçon 2 : 11 parties, oratrice et initiales correctes');
    /* Ouvre partie 1, vérifie phrases + Partie 1 / 11 */
    await p.locator('#home .pcard').first().click();
    await p.waitForSelector('#part .scard');
    const ph=await p.locator('#part .scard').count();
    if(ph!==8) throw new Error('phrases partie 1: '+ph);
    const top=await p.$eval('#part .topbar', e=>e.textContent);
    if(!/Partie 1 \/ 11/.test(top)) throw new Error('compteur partie: '+top);
    const s1=await p.$eval('#part .scard .stext', e=>e.textContent);
    if(!/In my first general conference message/.test(s1)) throw new Error('phrase 1: '+s1);
    ok('partie 1 : 8 phrases, « Partie 1 / 11 », texte aligné');
    /* Traduction française phrase 1 */
    await p.click('#tr0');
    const fr=await p.$eval('#fr0', e=>e.textContent);
    if(!/pouvoir transformateur/.test(fr)) throw new Error('traduction: '+fr.slice(0,80));
    ok('traduction française + vocabulaire affichés');
    /* Audio leçon 2 servi */
    const a=await p.evaluate(async()=>{ const r=await fetch('/echo/audio-lesson2.mp3',{headers:{Range:'bytes=0-1'}}); return {s:r.status,t:r.headers.get('content-type')}; });
    if(!(a.s===200||a.s===206)||!/audio\/mpeg/.test(a.t)) throw new Error(JSON.stringify(a));
    ok('audio leçon 2 servi en audio/mpeg');
    /* Verrou toujours actif sur leçon 2 */
    const lock=await p.$eval('#dn0', e=>e.textContent);
    if(!/🔒/.test(lock)) throw new Error('verrou absent leçon 2');
    ok('verrou « Je maîtrise » actif sur la leçon 2');
    /* Retour liste + leçon 1 intacte */
    await p.evaluate(()=>goLessons());
    await p.locator('#lessons .pcard').first().click();
    await p.waitForSelector('#home .hero');
    const h1=await p.$eval('#home', e=>e.textContent);
    if(!/Emily Belle Freeman/.test(h1)||!/Les 8 parties/.test(h1)) throw new Error('leçon 1 cassée');
    ok('leçon 1 intacte (8 parties, Emily Belle Freeman)');
    if(errs.length) throw new Error('JS: '+errs.join(' | '));
    ok('aucune erreur JavaScript');
  }catch(e){ ko('echo l2', e.message); }
  await b.close(); server.close();
  console.log(pass+'/'+(pass+fail)+' echo-l2 '+(fail?'❌':'OK'));
  process.exit(fail?1:0);
})();
