/*
  Tests navigateur Echo — PÉRIODE GRATUITE (ECHO_FREE=true) : porte membre,
  carte catalogue « GRATUIT », écran Echo sans tarifs, activation gratuite sur
  compte réel, /echo/ déverrouillé, dashboard, abonné payé intact, payé expiré.
  (Le parcours d'achat Wave reste testé côté serveur par test-echo-wave.js
  avec le drapeau désactivé — il resservira au retour du payant.)
  Lancer :  node test-echo-ui.js
*/
'use strict';
const PORT=4337; process.env.PORT=String(PORT); delete process.env.DATABASE_URL; delete process.env.WAVE_API_KEY;
const { chromium } = require('playwright');
const mail = require('./lib/mail'); mail._setTransport({ sendMail: async () => {} });
const H = require('./lib/handlers'); const store = require('./lib/store'); const w = require('./lib/wave');
const server = require('./server.js');
let pass=0,fail=0; const ok=n=>{pass++;console.log('OK  '+n)},ko=(n,e)=>{fail++;console.log('FAIL '+n+' :: '+e)};
(async()=>{
  await new Promise(r=>setTimeout(r,400));
  const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const ctx=await b.newContext({viewport:{width:390,height:844}});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  try{
    if(w.ECHO_FREE!==true) throw new Error('ECHO_FREE devrait être actif');
    await p.goto('http://127.0.0.1:'+PORT); await p.waitForTimeout(250);
    /* Porte : sans accès, /echo/ est verrouillé */
    const p2=await ctx.newPage();
    await p2.goto('http://127.0.0.1:'+PORT+'/echo/'); await p2.waitForTimeout(400);
    const locked=await p2.evaluate(()=>[...document.querySelectorAll('div')].some(d=>d.style.zIndex==='9999'&&/réservé aux membres/.test(d.textContent)&&/Activer mon accès/.test(d.textContent)));
    if(!locked) throw new Error('porte absente');
    ok('/echo/ sans accès → écran « réservé aux membres » + bouton Activer');
    await p2.close();
    /* Carte catalogue : GRATUIT (lancement) */
    await p.waitForSelector('.pathstep:has-text("Echo — L\'anglais par le shadowing")');
    const cardTxt=await p.$eval('.pathstep:has-text("Echo — L\'anglais par le shadowing")', e=>e.textContent);
    if(!/GRATUIT · offre de lancement/.test(cardTxt)) throw new Error('carte: '+cardTxt);
    ok('carte catalogue : « GRATUIT · offre de lancement »');
    /* Écran Echo : pas de tarifs, activation gratuite, transparence adaptée */
    await p.evaluate(()=>App.openEcho()); await p.waitForTimeout(250);
    const txt=await p.$eval('#main', e=>e.textContent);
    if(await p.$('.plancard')) throw new Error('cartes de prix affichées en période gratuite');
    if(/PROMO −50|2 000 FCFA|20 000/.test(txt)) throw new Error('tarifs visibles: '+txt.slice(0,120));
    if(!/temporairement gratuit/.test(txt)) throw new Error('transparence gratuite absente');
    if(!/acquis à vie/.test(txt)) throw new Error('mention certificats absente');
    if(!/Créer mon compte gratuit/.test(txt)) throw new Error('CTA sans compte absent');
    ok('écran Echo : aucun tarif, CTA compte, transparence « temporairement gratuit »');
    /* Compte réel + activation gratuite */
    const su=await H.signup({email:'free@x.com', prenom:'Adjoua', nom:'K', whatsapp:'0102030405', password:'secret9'});
    if(su.status!==200) throw new Error('signup: '+su.status);
    await p.evaluate(([tok])=>{ S.token=tok; S.user={prenom:'Adjoua',nom:'K',whatsapp:'0102030405',email:'free@x.com',prefix:'+225'}; save(); App.openEcho(); }, [su.body.token]);
    await p.waitForSelector('button:has-text("Activer mon accès gratuit")');
    await p.click('button:has-text("Activer mon accès gratuit")');
    await p.waitForSelector('#lessons .pcard', {timeout:8000});   // redirigé vers /echo/, porte ouverte
    ok('activation gratuite → inscription serveur + /echo/ ouvert directement');
    const u=await store.userGetByEmail('free@x.com');
    const enr=(await store.enrollmentsByUser(u.id)).find(e=>e.courseId==='echo');
    if(!enr||enr.paid) throw new Error('inscription serveur: '+JSON.stringify(enr));
    ok('serveur : inscription echo gratuite (paid:false) sur le compte');
    /* Retour app principale : écran Echo « accès actif » + dashboard */
    await p.goto('http://127.0.0.1:'+PORT+'/#echo'); await p.waitForTimeout(400);
    const t2=await p.$eval('#main', e=>e.textContent);
    if(!/Accès gratuit actif — offre de lancement/.test(t2)) throw new Error('état actif absent: '+t2.slice(0,150));
    ok('écran Echo : « Accès gratuit actif » + bouton Ouvrir Echo');
    await p.click('.tab:has-text("Mes cours")');
    await p.waitForSelector('.pathstep:has-text("Echo — Shadowing")');
    const mc=await p.$eval('.pathstep:has-text("Echo — Shadowing")', e=>e.textContent);
    if(!/Accès gratuit · lancement/.test(mc)) throw new Error('dashboard: '+mc);
    ok('« Mes cours » : carte Echo « Accès gratuit · lancement »');
    /* Abonné payé : rien ne change pour lui */
    const p4=await ctx.newPage();
    await p4.goto('http://127.0.0.1:'+PORT);
    await p4.evaluate(()=>{ S.enrolled.echo={at:Date.now(),paid:true,op:'Wave',ref:'T',expiresAt:Date.now()+40*86400e3}; save(); App.openEcho(); });
    await p4.waitForTimeout(400);
    const t4=await p4.$eval('#main', e=>e.textContent);
    if(!/Abonnement actif/.test(t4)||!/40 jour|Encore/.test(t4)) throw new Error('abonné payé: '+t4.slice(0,150));
    await p4.goto('http://127.0.0.1:'+PORT+'/echo/'); await p4.waitForTimeout(400);
    if(await p4.evaluate(()=>[...document.querySelectorAll('div')].some(d=>d.style.zIndex==='9999'))) throw new Error('abonné payé bloqué');
    ok('abonné payé : jours conservés, /echo/ ouvert');
    /* Payé EXPIRÉ : la porte le renvoie prolonger (comportement inchangé) */
    await p4.goto('http://127.0.0.1:'+PORT);
    await p4.evaluate(()=>{ S.enrolled.echo={at:Date.now(),paid:true,op:'Wave',ref:'T',expiresAt:Date.now()-86400e3}; save(); });
    await p4.goto('http://127.0.0.1:'+PORT+'/echo/'); await p4.waitForTimeout(400);
    const exp=await p4.evaluate(()=>[...document.querySelectorAll('div')].some(d=>d.style.zIndex==='9999'&&/expiré/.test(d.textContent)));
    if(!exp) throw new Error('porte expirée absente');
    ok('abonnement payé expiré → porte « accès expiré » (inchangé)');
    await p4.close();
    if(errs.length) throw new Error('JS: '+errs.join(' | '));
    ok('aucune erreur JavaScript');
  }catch(e){ ko('echo-free-ui', e.message); }
  await b.close(); server.close();
  console.log(pass+'/'+(pass+fail)+' echo-ui (période gratuite) '+(fail?'❌':'OK'));
  process.exit(fail?1:0);
})();
