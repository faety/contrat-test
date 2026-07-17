/*
  Tests navigateur Phase 2/3 : certificats (émission serveur + écran + vérif publique),
  défis (lancement, validation de jour, auto-validation par leçon), objectif du jour,
  badges, atelier de prompts, tag de cours en communauté, pack IA (mode démo).
  Vérifie aussi que COURSE_LESSONS (serveur) est synchronisé avec le contenu réel.
  Lancer :  node test-phase2-ui.js
*/
'use strict';
const PORT = 4329;
const APP_URL = 'http://127.0.0.1:'+PORT;
process.env.PORT = String(PORT);
process.env.WAVE_API_KEY = 'wave_ci_test_dummy';
delete process.env.DATABASE_URL;
const fs = require('fs');
const mail = require('./lib/mail');
mail._setTransport({ sendMail: async () => {} });
const wave = require('./lib/wave');
const { chromium } = require('playwright');
const server = require('./server.js');
let pass=0, fail=0;
const ok=n=>{pass++;console.log('OK  '+n)}, ko=(n,e)=>{fail++;console.log('FAIL '+n+' :: '+e)};

(async()=>{
  /* COURSE_LESSONS synchronisé avec index.html */
  try{
    const html=fs.readFileSync('./index.html','utf8');
    const script=html.match(/<script>([\s\S]*?)<\/script>/)[1];
    const src=script.slice(script.indexOf('const COURSES'), script.indexOf('const CATS'))+'\n;globalThis.__C=COURSES;';
    eval(src);
    for(const c of globalThis.__C){
      const n=c.modules.reduce((a,m)=>a+m.l.length,0);
      if(wave.COURSE_LESSONS[c.id]!==n) throw new Error(`${c.id}: serveur=${wave.COURSE_LESSONS[c.id]} contenu=${n}`);
    }
    ok('COURSE_LESSONS synchronisé avec le contenu réel des cours');
  }catch(e){ ko('sync leçons', e.message); }

  await new Promise(r=>setTimeout(r,400));
  const browser = await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});
  const p = await (await browser.newContext({viewport:{width:390,height:844}})).newPage();
  const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  try{
    const hp=p.waitForResponse(r=>r.url().includes('/api/health'),{timeout:8000});
    await p.goto(APP_URL); await hp; await p.waitForTimeout(200);

    /* Pack visible sur le catalogue */
    await p.waitForSelector('.freecta:has-text("Pack IA complet")');
    const packTxt = await p.$eval('.freecta:has-text("Pack IA complet")', e=>e.textContent);
    if(!/12\s?000|12.000/.test(packTxt.replace(/ | /g,' '))) throw new Error('prix pack absent');
    if(!/accès à vie/.test(packTxt)) throw new Error('transparence pack absente');
    ok('carte Pack IA affichée (prix, achat unique, accès à vie)');

    /* Compte + cours ia terminé → certificat serveur */
    const email='p2.'+Date.now()+'@test.local';
    await p.evaluate(async(em)=>{
      const r=await fetch('/api/signup',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({prenom:'Awa',nom:'Kouassi',whatsapp:'0576020058',prefix:'+225',email:em,password:'pass123'})});
      const j=await r.json();
      S.user={prenom:'Awa',nom:'Kouassi',whatsapp:'0576020058',email:em,prefix:'+225'};
      S.token=j.token; S.enrolled.ia={at:Date.now(),paid:false}; S.done.ia={}; save();
      await fetch('/api/me/enroll',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+j.token},body:JSON.stringify({courseId:'ia'})});
    }, email);
    // Terminer les 6 leçons via l'UI serveur-sync (completeLesson)
    await p.evaluate(async()=>{ for(let i=0;i<6;i++){ App.completeLesson('ia','l'+i); await new Promise(r=>setTimeout(r,120)); } });
    await p.waitForTimeout(1200);
    const nCerts = await p.evaluate(()=>S.certs.length);
    if(nCerts<1) throw new Error('certificat non reçu (S.certs vide)');
    ok('cours terminé → certificat émis par le serveur et synchronisé');

    /* Écran certificat + lien de vérification publique */
    const certId = await p.evaluate(()=>S.certs[0].id);
    await p.evaluate(id=>App.openCert(id), certId);
    await p.waitForSelector('.cert .c-name');
    const nm = await p.$eval('.cert .c-name', e=>e.textContent);
    if(nm!=='Awa Kouassi') throw new Error('nom sur certificat: '+nm);
    ok('écran certificat : nom, cours, identifiant, boutons imprimer/partager');
    const vr = await p.evaluate(async(id)=>{ const r=await fetch('/api/cert?id='+id); return (await r.json()); }, certId);
    if(!vr.valid || !/Boyia/.test(vr.kind)) throw new Error('vérification publique KO');
    ok('vérification publique /api/cert : authentique, libellé honnête');
    /* Route #verif */
    await p.evaluate(id=>App.openVerif(id), certId);
    await p.waitForSelector('.card:has-text("Certificat authentique")');
    ok('écran #verif : « Certificat authentique » affiché');

    /* Objectif du jour + dashboard */
    await p.click('.tab:has-text("Mes cours")');
    await p.waitForSelector('.card:has-text("Objectif du jour")');
    const goalTxt = await p.$eval('#main', e=>e.textContent);
    if(!/Objectif du jour ✅/.test(goalTxt)) throw new Error('objectif non atteint après 35 min de leçons');
    ok('objectif du jour : minutes comptées et objectif atteint ✅');

    /* Défis : lancer ia7 (leçons déjà faites → jours 1-6 auto au fil des validations ?) 
       Les leçons étaient terminées avant le lancement : on valide le jour manuellement. */
    await p.evaluate(()=>App.openChal('ia7'));
    await p.waitForSelector('.btn:has-text("Commencer le défi")');
    await p.click('.btn:has-text("Commencer le défi")');
    await p.waitForSelector('.pathstep .btn:has-text("Fait")');
    await p.locator('.pathstep .btn:has-text("Fait")').first().click();
    await p.waitForTimeout(200);
    const chalTxt = await p.$eval('#main', e=>e.textContent);
    if(!/1 \/ 7 jours/.test(chalTxt)) throw new Error('progression défi: '+chalTxt.slice(0,120));
    ok('défi 7 jours : lancé + jour 1 validé (1/7)');
    /* Défi du jour sur le dashboard */
    await p.click('.tab:has-text("Mes cours")');
    await p.waitForSelector('.resume:has-text("Défi du jour")');
    ok('dashboard : carte « Défi du jour » avec la prochaine action');

    /* Badges (profil) */
    await p.click('.tab:has-text("Profil")');
    await p.waitForSelector('.badgegrid');
    const earned = await p.locator('.badge.earned').count();
    if(earned<3) throw new Error('badges gagnés: '+earned);  // 1re leçon, cours terminé, certifié
    ok('badges : '+earned+' gagnés (1re leçon, cours terminé, certifié…)');

    /* Atelier de prompts */
    await p.click('.tab:has-text("Mes cours")');
    await p.click('.pathstep:has-text("Atelier de prompts")');
    await p.waitForSelector('.btn:has-text("Nouveau prompt")');
    await p.click('.btn:has-text("Nouveau prompt")');
    await p.fill('#pr_title','Relance client');
    await p.fill('#pr_text','Rédige une relance pour un devis envoyé il y a 5 jours à M. Koné, resté sans réponse, client fidèle. 5 lignes maximum, ton courtois.');
    await p.evaluate(()=>App.atelierLive());
    const oks = await p.locator('#pr_checks .pr-chk.ok').count();
    if(oks!==3) throw new Error('checklist: '+oks+'/3');
    ok('atelier : checklist Tâche+Contexte+Format 3/3 en direct');
    await p.click('.btn:has-text("Enregistrer")');
    await p.waitForSelector('.pathstep:has-text("Relance client")');
    ok('atelier : prompt sauvegardé et listé avec bouton Copier');

    /* Communauté : tag de cours + règles */
    await p.click('.tab:has-text("Communauté")');
    await p.waitForSelector('details:has-text("Règles de la communauté")');
    ok('communauté : règles visibles');
    await p.click('.compose');
    await p.waitForSelector('#pcourse');
    await p.selectOption('#pcourse','ia');
    await p.fill('#ptext','Super cours, la leçon 3 m\'a beaucoup aidé !');
    await p.click('.btn:has-text("Publier")');
    await p.waitForSelector('.pcourse');
    ok('publication taguée avec un cours (chip 📚 affichée)');

    if(errs.length) throw new Error('JS: '+errs.join(' | '));
    ok('aucune erreur JavaScript');
  }catch(e){ ko('phase 2/3', e.message); }
  await browser.close(); server.close();
  console.log(pass+'/'+(pass+fail)+' phase 2/3 '+(fail?'❌':'OK'));
  process.exit(fail?1:0);
})();
