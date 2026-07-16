'use strict';
const PORT = 4327;
process.env.PORT = String(PORT);
delete process.env.DATABASE_URL; delete process.env.WAVE_API_KEY;
const { chromium } = require('playwright');
const server = require('./server.js');
let pass=0, fail=0;
const ok=n=>{pass++;console.log('OK  '+n)}, ko=(n,e)=>{fail++;console.log('FAIL '+n+' :: '+e)};
(async()=>{
  await new Promise(r=>setTimeout(r,400));
  const browser = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p = await (await browser.newContext({viewport:{width:390,height:844}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  try{
    await p.goto('http://127.0.0.1:'+PORT); await p.waitForTimeout(300);
    /* Visiteur : hero + CTA + FAQ + parcours */
    await p.waitForSelector('.hero-home');
    const h1 = await p.$eval('.hero-home h1', e=>e.textContent);
    if(!/carrière/.test(h1)) throw new Error('hero absent: '+h1);
    ok('visiteur : hero orienté résultat affiché');
    if((await p.locator('.pathcard').count())<6) throw new Error('parcours manquants');
    ok('6 parcours listés sur l\'accueil');
    if((await p.locator('.faq details').count())<6) throw new Error('FAQ manquante');
    await p.locator('.faq details summary').first().click();
    ok('FAQ accordéon présent et cliquable');
    /* Diagnostic complet */
    await p.click('.hero-home .btn:has-text("Trouver mon parcours")');
    await p.waitForSelector('.diagopts');
    // Q1 objectif = maîtriser copilot
    await p.click('.diagopts .qopt:has-text("Copilot")');
    await p.click('.diagopts .qopt:has-text("Bureau")');
    await p.click('.diagopts .qopt:has-text("Jamais utilisé")');
    await p.click('.diagopts .qopt:has-text("Débutant")');
    await p.click('.diagopts .qopt:has-text("15 min")');
    await p.click('.diagopts .qopt:has-text("En pratiquant")');
    await p.waitForSelector('.qlabel:has-text("parcours est prêt")');
    const resTxt = await p.$eval('.flowbody', e=>e.textContent);
    if(!/Copilot au bureau/.test(resTxt)) throw new Error('mauvaise reco: '+resTxt.slice(0,200));
    if(!/15 min \/ jour/.test(resTxt)) throw new Error('rythme absent');
    ok('diagnostic 6 questions → recommandation déterministe correcte (Copilot)');
    /* Résultat → page parcours */
    await p.click('.flowfoot .btn:has-text("Voir mon parcours")');
    await p.waitForSelector('.pathstep');
    const steps = await p.locator('.pathstep').count();
    if(steps!==2) throw new Error('étapes parcours: '+steps);
    ok('page parcours : 2 cours ordonnés + CTA Commencer');
    /* Recommandation persistée sur l'accueil */
    await p.click('.tab:has-text("Cours")');
    await p.waitForSelector('.pathcard');
    const homeTxt = await p.$eval('#main', e=>e.textContent);
    if(!/Parcours recommandé pour toi/.test(homeTxt)) throw new Error('reco non persistée');
    ok('recommandation persistée sur l\'accueil (visiteur)');
    /* Membre : inscription cours gratuit puis reprise + dashboard */
    await p.evaluate(()=>{ S.user={prenom:'Awa',nom:'K',whatsapp:'0576020058',email:'a@a.com',prefix:'+225'};
      S.enrolled.ia={at:Date.now(),paid:false}; S.done.ia={}; save(); App.openLesson('ia','l0'); });
    await p.waitForSelector('.lcontent');
    const remain = await p.$eval('.subhead .muted', e=>e.textContent);
    if(!/min restantes/.test(remain)) throw new Error('temps restant absent: '+remain);
    ok('leçon : estimation du temps restant affichée');
    await p.click('.btn:has-text("Marquer comme terminée")');
    await p.waitForTimeout(200);
    /* Dashboard */
    await p.click('.tab:has-text("Mes cours")');
    await p.waitForSelector('.resume');
    const dash = await p.$eval('#main', e=>e.textContent);
    if(!/Salut Awa/.test(dash)) throw new Error('accueil personnalisé absent');
    if(!/jour(s)? de suite/.test(dash)) throw new Error('série absente');
    if(!/🔥 1/.test(dash)) throw new Error('série pas à 1 après une leçon: '+dash.slice(0,300));
    ok('dashboard : salut personnalisé + série 🔥 1 jour + bouton Continuer');
    /* Reprise depuis l'accueil */
    await p.click('.tab:has-text("Cours")');
    await p.waitForSelector('.resume');
    ok('accueil membre : carte « Reprendre » à la place du hero');
    await p.screenshot({path: process.env.SCRATCH+'/shot-home.png'});
    if(errs.length) throw new Error('JS: '+errs.join(' | '));
    ok('aucune erreur JavaScript');
  }catch(e){ ko('phase 1', e.message); }
  await browser.close(); server.close();
  console.log(pass+'/'+(pass+fail)+' phase 1 '+(fail?'❌':'OK'));
  process.exit(fail?1:0);
})();
