/*
  Tests navigateur Echo (abonnement shadowing) : carte catalogue, écran tarifs
  (promo annuelle −50 % jusqu'au 5 août 2026 11h59 GMT), transparence (pas de
  prélèvement automatique), achat mensuel (démo), accès /echo/ avec porte
  abonné, carte « Mes cours » avec jours restants, prolongation qui ADDITIONNE.
  Lancer :  node test-echo-ui.js
*/
'use strict';
const PORT=4337; process.env.PORT=String(PORT); delete process.env.DATABASE_URL; delete process.env.WAVE_API_KEY;
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
    await p.goto('http://127.0.0.1:'+PORT); await p.waitForTimeout(250);
    /* Porte abonné : sans abonnement, /echo/ est verrouillé */
    const p2=await ctx.newPage();
    await p2.goto('http://127.0.0.1:'+PORT+'/echo/'); await p2.waitForTimeout(400);
    const locked=await p2.evaluate(()=>[...document.querySelectorAll('div')].some(d=>d.style.zIndex==='9999'&&/réservé aux abonnés/.test(d.textContent)));
    if(!locked) throw new Error('porte absente');
    ok('/echo/ sans abonnement → écran « réservé aux abonnés »');
    await p2.close();
    /* Carte catalogue (catégorie Anglais/Tout) */
    await p.waitForSelector('.pathstep:has-text("Echo — L\'anglais par le shadowing")');
    ok('carte Echo sur le catalogue');
    /* Écran Echo : promo + transparence */
    await p.evaluate(()=>App.openEcho());
    await p.waitForSelector('.plancard');
    const txt=await p.$eval('#main', e=>e.textContent);
    if(!/PROMO −50 % jusqu'au 5 août 2026 à 11h59/.test(txt)) throw new Error('promo absente');
    if(!/10 000|10 000/.test(txt.replace(/ /g,' ')) || !/20 000|20 000/.test(txt.replace(/ /g,' '))) throw new Error('prix promo/barré absents');
    if(!/aucun prélèvement automatique/.test(txt)) throw new Error('transparence absente');
    ok('écran Echo : promo −50 % (10 000 F, 20 000 F barré) + transparence');
    /* Achat mensuel en mode démo (compte + paiement simulé) */
    await p.evaluate(()=>{ S.user={prenom:'Awa',nom:'K',whatsapp:'0576020058',email:'a@a.com',prefix:'+225'}; save(); });
    await p.click('.plancard:not(.best) .btn');
    await p.waitForSelector('.op');
    if(await p.$('#couponInput')) throw new Error('champ coupon affiché pour un abonnement');
    const note=await p.$eval('.flowbody', e=>e.textContent);
    if(!/aucun prélèvement automatique/.test(note)) throw new Error('mention abonnement absente du paiement');
    await p.click('.op:has-text("Wave")');
    await p.click('.flowfoot .btn');           // Continuer (démo)
    await p.waitForSelector('#finput');
    const amt=await p.$eval('.flowfoot .btn', e=>e.textContent);
    if(!/2[^0-9]?000/.test(amt)) throw new Error('montant mensuel: '+amt);
    ok('paiement mensuel : 2 000 F, sans coupon, mention « aucun prélèvement »');
    await p.fill('#finput','0576020058');
    await p.click('.flowfoot .btn');           // Payer (démo)
    await p.waitForSelector('.bigcheck', {timeout:8000});
    await p.click('.flowfoot .btn');           // terminé → openEcho
    await p.waitForSelector('.card:has-text("Abonnement actif")');
    const days1=await p.evaluate(()=>echoDaysLeft());
    if(days1!==31) throw new Error('jours restants: '+days1);
    ok('abonnement activé : 31 jours d\'accès, écran « actif » avec bouton Ouvrir Echo');
    /* Prolongation : annuel → jours ADDITIONNÉS */
    await p.click('.plancard.best .btn');
    await p.click('.op:has-text("Wave")');
    await p.click('.flowfoot .btn');
    await p.fill('#finput','0576020058');
    await p.click('.flowfoot .btn');
    await p.waitForSelector('.bigcheck', {timeout:8000});
    await p.click('.flowfoot .btn');
    const days2=await p.evaluate(()=>echoDaysLeft());
    if(days2!==397) throw new Error('prolongation: '+days2+' (397 attendu)');
    ok('prolongation annuelle : 31+366 = '+days2+' jours (rien de perdu)');
    /* /echo/ accessible maintenant */
    const p3=await ctx.newPage();
    await p3.goto('http://127.0.0.1:'+PORT+'/echo/'); await p3.waitForTimeout(500);
    const still=await p3.evaluate(()=>[...document.querySelectorAll('div')].some(d=>d.style.zIndex==='9999'));
    if(still) throw new Error('encore verrouillé après abonnement');
    const app=await p3.$eval('body', e=>e.textContent);
    if(!/shadowing|Echo|écoute/i.test(app)) throw new Error('app echo non chargée');
    ok('/echo/ déverrouillé pour l\'abonné (même appareil)');
    await p3.close();
    /* Mes cours : carte Echo avec jours restants */
    await p.click('.tab:has-text("Mes cours")');
    await p.waitForSelector('.pathstep:has-text("Echo — Shadowing")');
    const mc=await p.$eval('.pathstep:has-text("Echo — Shadowing")', e=>e.textContent);
    if(!/397 j restants/.test(mc)) throw new Error('jours restants Mes cours: '+mc);
    ok('« Mes cours » : Echo actif avec 397 j restants');
    if(errs.length) throw new Error('JS: '+errs.join(' | '));
    ok('aucune erreur JavaScript');
  }catch(e){ ko('echo', e.message); }
  await b.close(); server.close();
  console.log(pass+'/'+(pass+fail)+' echo '+(fail?'❌':'OK'));
  process.exit(fail?1:0);
})();
