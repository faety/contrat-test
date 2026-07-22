'use strict';
const PORT=4343; process.env.PORT=String(PORT); delete process.env.DATABASE_URL; delete process.env.WAVE_API_KEY;
const { chromium } = require('playwright');
const server = require('./server.js');
let pass=0,fail=0; const ok=n=>{pass++;console.log('OK  '+n)},ko=(n,e)=>{fail++;console.log('FAIL '+n+' :: '+e)};
(async()=>{
  await new Promise(r=>setTimeout(r,400));
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const ctx=await b.newContext({viewport:{width:390,height:844}});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  try{
    // abonnement valide en localStorage
    await p.goto('http://127.0.0.1:'+PORT);
    await p.evaluate(()=>{ S.enrolled.echo={at:Date.now(),paid:true,op:'Wave',ref:'T',expiresAt:Date.now()+30*86400e3}; save(); });
    await p.goto('http://127.0.0.1:'+PORT+'/echo/'); await p.waitForTimeout(400);
    await p.evaluate(()=>openPart('l1p1'));
    await p.waitForSelector('#dn0');
    /* Verrouillé au départ */
    const t0=await p.$eval('#dn0', e=>e.textContent);
    if(!/🔒/.test(t0)) throw new Error('bouton non verrouillé: '+t0);
    ok('« Je maîtrise » verrouillé 🔒 au départ');
    await p.click('#dn0'); await p.waitForTimeout(150);
    let st=await p.evaluate(()=>({c:!!state.completed['l1p1:0'], toast:(document.querySelector('.toast')||{}).textContent||''}));
    if(st.c) throw new Error('validation passée sans conditions');
    if(!/Écoute la phrase .* enregistre ta voix/.test(st.toast)) throw new Error('toast: '+st.toast);
    ok('clic verrouillé → refus + message « écoute + enregistre »');
    /* Écouté seulement */
    await p.evaluate(()=>{ state.listened['l1p1:0']=1; save(); refreshDoneBtn(0); });
    await p.click('#dn0'); await p.waitForTimeout(150);
    st=await p.evaluate(()=>({c:!!state.completed['l1p1:0'], toast:(document.querySelector('.toast')||{}).textContent||''}));
    if(st.c) throw new Error('validé sans enregistrement');
    if(!/Enregistre ta voix/.test(st.toast)) throw new Error('toast enregistrement: '+st.toast);
    ok('écouté mais pas enregistré → refus ciblé « enregistre ta voix »');
    /* Écouté + enregistré → déverrouillé et validable */
    await p.evaluate(()=>{ state.recorded['l1p1:0']=1; save(); refreshDoneBtn(0); });
    const t1=await p.$eval('#dn0', e=>e.textContent);
    if(/🔒/.test(t1)) throw new Error('encore verrouillé: '+t1);
    await p.click('#dn0'); await p.waitForTimeout(150);
    st=await p.evaluate(()=>({c:!!state.completed['l1p1:0']}));
    if(!st.c) throw new Error('validation refusée à tort');
    ok('écouté + enregistré → bouton déverrouillé, validation acceptée');
    /* Décocher reste possible */
    await p.click('#dn0'); await p.waitForTimeout(100);
    if(await p.evaluate(()=>!!state.completed['l1p1:0'])) throw new Error('décochage impossible');
    ok('décocher une phrase reste possible');
    /* Persistance après rechargement */
    await p.reload(); await p.waitForTimeout(400);
    await p.evaluate(()=>openPart('l1p1'));
    await p.waitForSelector('#dn0');
    const t2=await p.$eval('#dn0', e=>e.textContent);
    if(/🔒/.test(t2)) throw new Error('déverrouillage non persisté');
    ok('écoute/enregistrement persistés après rechargement');
    /* Score de précision : fonction pure */
    const sc=await p.evaluate(()=>({
      exact: pronScore('Several weeks ago we began planning', 'several weeks ago we began planning').pct,
      partial: pronScore('Several weeks ago we began planning', 'several weeks planning').pct,
      empty: pronScore('Several weeks ago we began planning', '').pct,
      punct: pronScore("And then my husband, Greg, received a phone call he couldn't ignore.", "and then my husband greg received a phone call he couldn't ignore").pct,
      missed: pronScore('Several weeks ago we began planning', 'several weeks ago').missed,
    }));
    if(sc.exact!==100||sc.punct!==100) throw new Error('exact: '+JSON.stringify(sc));
    if(!(sc.partial>30&&sc.partial<80)||sc.empty!==0) throw new Error('partial/empty: '+JSON.stringify(sc));
    if(!sc.missed.includes('planning')) throw new Error('missed: '+JSON.stringify(sc.missed));
    ok('pronScore : 100 % exact (ponctuation ignorée), partiel gradué, mots manqués listés');
    /* Affichage du score */
    await p.evaluate(()=>{ state.recorded['l1p1:0']=1; showRecPanel(0); applyScore(0, currentPart.sentences[0].en); });
    const line=await p.$eval('#sl0 .score-line', e=>e.textContent);
    if(!/Précision : 100 %/.test(line)) throw new Error('ligne score: '+line);
    ok('ligne « 🎯 Précision : 100 % » affichée dans le panneau');
    if(errs.length) throw new Error('JS: '+errs.join(' | '));
    ok('aucune erreur JavaScript');
  }catch(e){ ko('gate/score', e.message); }
  await b.close(); server.close();
  console.log(pass+'/'+(pass+fail)+' echo-gate '+(fail?'❌':'OK'));
  process.exit(fail?1:0);
})();
