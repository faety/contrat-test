# Kalan — Cahier des charges pour reproduction par un agent (Codex)

> Ce document est **auto-suffisant**. Un agent de code (Codex ou autre) doit pouvoir
> reproduire **textuellement** l'application Kalan à partir de ce seul fichier, sans
> accès au dépôt d'origine. Il décrit l'intention, les contraintes, le design, le
> modèle de données, chaque écran, chaque parcours, les règles, **le contenu réel des
> cours** et les tests d'acceptation.

Langue de toute l'interface et de tout le contenu : **français**.

---

## 0. Résumé exécutable (à lire en premier)

- **Produit** : Kalan (« apprendre » en bambara), une webapp **mobile first** de cours
  en ligne doublée d'une **communauté** simple. Cible : actifs et futurs actifs
  d'Afrique francophone (de l'Ouest et centrale).
- **Objectif business** : valider l'idée avec de **vrais utilisateurs**, tout de suite.
  L'app doit être **testable immédiatement**, sans installation.
- **Livrable technique** : **un seul fichier `index.html`**, autonome, sans build, sans
  backend, sans dépendance externe, sans police ni image distante. Tout l'état est
  persisté dans `localStorage`. Icônes = SVG inline (jeu Feather, licence MIT).
- **Parcours signature** :
  1. **Inscription façon Tally** : une question par écran (prénom → nom → numéro
     WhatsApp avec indicatif → e-mail), barre de progression, validation champ par
     champ, touche Entrée pour avancer, récapitulatif avant confirmation. Le compte
     n'est demandé **qu'au moment de s'inscrire à un cours** (exploration sans friction).
  2. **Paiement mobile money simulé** : choix opérateur (Wave, Orange Money, MTN MoMo,
     Moov Money) → numéro pré-rempli → écran d'attente « confirme avec ton code secret »
     → reçu avec référence. **Aucun paiement réel** : mode démo.
  3. **Communauté façon Skool** : fil avec catégories, publications, j'aime,
     commentaires, classement par points (gamification légère).
- **Contenu** : voir §9. Deux **cours gratuits** montés à partir de **vidéos YouTube**
  (IA d'introduction + anglais débutant). Trois **cours payants IA rédigés
  intégralement** (ChatGPT, Claude, Copilot), pédagogiques, **compréhensibles sans
  vidéo**, avec **emplacements vidéo réservés** (à tourner plus tard).

Décisions issues de la recherche produit :
- **Tally / Typeform** : le format « une question à la fois » avec progression visible
  augmente le taux de complétion → appliqué à l'inscription.
- **Skool** : réunir cours + communauté + gamification au même endroit, avec une
  interface volontairement minimale → structure à 4 onglets.
- **Mobile money** : rail de paiement **principal** en Afrique de l'Ouest/centrale → le
  parcours reproduit les codes connus (choix opérateur → numéro → confirmation par code
  secret → reçu).

---

## 1. Contraintes techniques (non négociables)

1. **Un fichier** : `index.html` à la racine. Ouvrable par double-clic (`file://`) ou via
   `python3 -m http.server`. Aucune étape de build.
2. **Zéro dépendance runtime** : pas de framework, pas de CDN, pas de webfont distante,
   pas d'image distante, pas d'appel réseau. JavaScript **vanilla** (ES2020), un seul
   `<script>` inline. CSS inline dans un seul `<style>`.
3. **Icônes** : SVG inline, style Feather (trait, `stroke="currentColor"`, `stroke-width`
   ~2). Aucune balise `<img>`.
4. **Typographie** : **polices système uniquement**.
   - Serif (marque, titres éditoriaux) :
     `"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif`.
   - Sans-serif (interface) :
     `system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif`.
5. **Mobile first** : coquille centrée `max-width:448px`. Zones tactiles ≥ 44 px.
   `viewport-fit=cover` + `env(safe-area-inset-*)` pour les barres basses.
6. **Persistance** : `localStorage`, une seule clé `kalan-v1` (JSON). Bouton
   « Réinitialiser la démo » dans Profil (efface la clé + `location.reload()`).
7. **Accessibilité** : `aria-label` sur les boutons-icônes, `:focus-visible` visible,
   `role="status"` + `aria-live="polite"` sur le toast, respect de
   `prefers-reduced-motion` (animations quasi nulles si activé).
8. **Thèmes** : clair / sombre / auto, via **tokens CSS**. `prefers-color-scheme`
   pour l'auto ; l'attribut `data-theme="light|dark"` sur `<html>` **surclasse** la media
   query dans les deux sens. Ne jamais styler un composant directement dans la media
   query : passer par les tokens.
9. **Données 100 % fictives** : personnes, montants, paiements, messages sont des
   données de démonstration. Un avertissement le rappelle dans Profil et le README.

Structure interne du `<body>` :
```html
<div id="shell">
  <main id="main"></main>
  <nav id="tabbar" aria-label="Navigation principale"></nav>
</div>
<div id="overlay"></div>
<div id="toast" role="status" aria-live="polite"></div>
<script> /* toute la logique */ </script>
```
Rendu = fonctions qui retournent des chaînes HTML injectées dans `#main` (`innerHTML`).
Pas de DOM diffing : on re-rend l'écran courant à chaque changement d'état via `render()`.

---

## 2. Design system (tokens exacts)

Définir les tokens sur `:root`, les redéfinir dans `@media (prefers-color-scheme: dark)`,
puis les redéfinir encore dans `:root[data-theme="dark"]` et `:root[data-theme="light"]`
(pour que le bouton de thème gagne toujours).

**Thème clair (`:root` et `:root[data-theme="light"]`)**
```
--ground:#F7F5F0;  --surface:#FFFFFF;  --surface-2:#F0EDE6;
--ink:#201D19;     --muted:#6E675C;    --line:#E4DFD5;
--primary:#0C7A5B; --primary-deep:#085C45; --primary-soft:#E2F0EA;
--accent:#E8A020;  --accent-soft:#FBEFD9;
--danger:#C24C3B;  --ok:#0C7A5B;
--shadow:0 1px 2px rgba(32,29,25,.06),0 6px 18px rgba(32,29,25,.07);
--r:16px; --r-sm:10px;
```

**Thème sombre (`@media dark` et `:root[data-theme="dark"]`)**
```
--ground:#121815;  --surface:#1B2420;  --surface-2:#222D28;
--ink:#F0EDE6;     --muted:#9AA69D;    --line:#2C3831;
--primary:#3BBE92; --primary-deep:#2FA57D; --primary-soft:#1E332B;
--accent:#F0B24A;  --accent-soft:#33291A;
--danger:#E0705E;  --ok:#3BBE92;
--shadow:0 1px 2px rgba(0,0,0,.3),0 8px 22px rgba(0,0,0,.35);
```

Concept visuel : palette « papier & kola » — fond papier chaud, **vert kola** en primaire,
**ambre** en accent (prix payants, étoiles, points). Le neutre est légèrement chaud (biais
vers l'accent), jamais un gris pur. Marque et titres en serif ; interface en sans-serif.

Dégradés des couvertures de cours (tableau `GRADS`, index 0→5) :
```
0 linear-gradient(135deg,#0C7A5B,#1FA37E)   (vert kola)
1 linear-gradient(135deg,#B4560F,#E8A020)   (ambre)
2 linear-gradient(135deg,#254A87,#3E7CB9)   (bleu)
3 linear-gradient(135deg,#6B2D5C,#A34A8C)   (prune)
4 linear-gradient(135deg,#155E63,#2D9596)   (sarcelle)
5 linear-gradient(135deg,#7A3B0C,#B4560F)   (terre)
```
Sur chaque couverture : grande initiale du titre en filigrane (serif, blanc ~25 %
d'opacité, coin haut-droit) + une pastille prix (`Gratuit` en vert doux / prix en ambre).

Composants clés (classes CSS à conserver, elles sont référencées par les tests) :
`.card`, `.btn` (+ `.ghost`, `.soft`), `.chip` (+ `.on`), `.pill` (+ `.free`, `.paid`),
`.search`, `.ccard`/`.cover`/`.cbody`/`.ctitle`/`.cmeta`, `.hero`/`.dtitle`/`.instr`/
`.statrow`/`.stat`, `.sect`, `.learnlist`, `.modules`/`.module`/`.mhead`/`.lesson`,
`.ctabar`, `.flow`/`.progress`/`.flowhead`/`.flowbody`/`.flowfoot`, `.qnum`/`.qlabel`/
`.qhelp`/`.qinput`/`.phonerow`/`.qerr`/`.recap`, `.ops`/`.op`/`.oplogo`/`.radio`,
`.paywait`/`.spinner`/`.ussd`/`.bigcheck`/`.receipt`, `.compose`/`.feed`/`.post`/
`.phead`/`.pcat`/`.ptext`/`.pacts`/`.pact`(+`.liked`), `.leader`/`.leadrow`/`.rank`,
`.comments`/`.comment`/`.cbar`, `.composer`/`.catpick`, `.mccard`/`.pbar`, `.empty`,
`.lplayer`/`.lcontent`, `.pcard`/`.pstats`/`.prow`(+`.danger`), `#toast`.

Animations : `fadeIn` (0.22s) sur `.screen`, `slideUp` (0.26s) sur `.flow`, `spin` sur
`.spinner`. Toutes réduites à ~0 sous `prefers-reduced-motion`.

---

## 3. Navigation & rendu

État de navigation :
```js
let V = { tab:'cours', screen:'catalog', p:{} };   // p = paramètres (id de cours, clé de leçon…)
let filters = { cat:'Tout', q:'', commu:'Tout' };  // filtres catalogue + communauté
function go(tab, screen, p={}) { V = {tab,screen,p}; render(); window.scrollTo(0,0); }
```

Barre d'onglets (`#tabbar`) — 4 onglets, icône + libellé, état actif en primaire :
`cours` (Cours, icône livre) · `commu` (Communauté, icône users) ·
`mescours` (Mes cours, icône play) · `profil` (Profil, icône user).
`App.tab(id)` réinitialise `filters.q` et route vers l'écran par défaut de l'onglet :
`{cours:'catalog', commu:'feed', mescours:'my', profil:'profil'}`.

Dispatcher de rendu :
```js
function render(){
  const screens = {
    catalog, course, learn, lesson,      // Cours
    feed, post, leader, compose,         // Communauté
    my, profil                           // Mes cours / Profil
  };
  document.getElementById('main').innerHTML = (screens[V.screen] || catalog)();
  renderTabs();
}
```
Les **overlays plein écran** (inscription Tally, paiement, écran de bienvenue) sont rendus
séparément dans `#overlay` par `renderFlow()` et bloquent le scroll du body.

---

## 4. Modèle d'état persistant

Clé `localStorage` : `kalan-v1`. Forme (fusionnée avec un état de base au chargement) :
```js
function baseState(){
  return {
    user: null,        // {prenom, nom, whatsapp, email, prefix}  (prefix = indicatif ex "+225")
    enrolled: {},      // courseId -> {at, paid, op, ref}
    done: {},          // courseId -> { [lessonKey]: true }
    points: 0,
    likes: {},         // postId -> true
    posts: null,       // copie mutable des posts (initialisée au 1er chargement, voir §7)
    theme: null        // null = auto | 'light' | 'dark'
  };
}
```
- `save()` : `localStorage.setItem('kalan-v1', JSON.stringify(S))` (try/catch).
- Au démarrage : lire la clé, `Object.assign(baseState(), parsed)`. Si `S.posts` est null,
  l'initialiser depuis `SEED_POSTS` en convertissant les `at` relatifs en timestamps
  absolus (`Date.now() - offset`), idem pour les commentaires.
- `applyTheme()` : si `S.theme` → `document.documentElement.dataset.theme = S.theme`,
  sinon supprimer l'attribut (auto).

Clés de leçon : une leçon est identifiée par `'l' + index` où l'index est l'ordre global
de la leçon dans le cours (à plat, tous modules confondus, en partant de 0).

Utilitaires :
```js
const esc  = s => s.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fcfa = n => n===0 ? 'Gratuit' : n.toLocaleString('fr-FR')+' FCFA';
const initials = n => n.trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
// ago(t): 'à l'instant' | 'il y a N min' | 'il y a N h' | 'il y a N j' | date courte fr-FR
// toast(msg): affiche #toast 2,4 s.  addPoints(n, why): S.points+=n; save(); toast(`+${n} points — ${why}`)
// lessonCount(c), doneCount(c), courseProgress(c) = Math.round(100*done/total)
```
Chiffres alignés : classe `.num` → `font-variant-numeric: tabular-nums` (montants, numéros,
compteurs, points).

---

## 5. Écrans (spécification)

Chaque écran est une fonction retournant du HTML, enveloppé dans `<div class="screen">`.

### 5.1 `catalog` (onglet Cours, écran par défaut)
- En-tête « marque » : logo `Ka<em>lan</em>` (serif, `lan` en primaire) + baseline
  « Apprends une compétence utile, à ton rythme. » ; si connecté, avatar (initiales)
  cliquable vers Profil.
- Barre de recherche (icône loupe + `input[type=search]`), `oninput` → `App.search(v)`
  (filtre live sur titre + formateur + description ; conserve le focus après re-render).
- Rangée de **chips catégories** défilable : voir `CATS` (§7). Chip actif = fond encre.
- Liste de cartes de cours filtrées par catégorie ET recherche. Si aucun résultat : bloc
  `.empty` (« Aucun cours trouvé »).
- **Carte de cours** (`.ccard`, bouton) : couverture dégradée + initiale + pastille prix ;
  corps = titre, méta (formateur · ⭐ note · N inscrits) ; si l'utilisateur est inscrit,
  une barre de progression + « Inscrit · X % terminé ».

### 5.2 `course` (détail d'un cours)
- Sous-en-tête collant : bouton retour + catégorie.
- Héros dégradé (initiale filigrane + pastille prix).
- Titre (serif), bloc formateur (avatar initiales + nom + rôle).
- Rangée de 4 stats : note ★, inscrits, durée, nombre de leçons.
- Description.
- Section « Ce que tu vas apprendre » : liste à puces avec icône check (`c.learn`).
- Section « Programme · N leçons » : accordéon visuel par module (`.module`), chaque
  leçon (`.lesson`) affiche icône (cercle si non inscrit, play si inscrit, check si
  terminée), titre, durée. Cliquer une leçon → `App.openLesson(courseId, key)` (qui
  déclenche l'inscription si pas encore inscrit).
- **Barre d'action basse** (`.ctabar`, fixe) : prix + libellé, et bouton :
  - non inscrit, payant → « S'inscrire au cours »
  - non inscrit, gratuit → « S'inscrire gratuitement »
  - déjà inscrit → « Continuer » vers l'espace d'apprentissage.

### 5.3 `learn` (espace d'apprentissage d'un cours suivi)
- Sous-en-tête retour + titre du cours.
- Carte de progression (barre + « X / N leçons · P % » ; message de félicitations à 100 %).
- Liste des modules/leçons cliquables (play / check).

### 5.4 `lesson` (lecture d'une leçon)
- Sous-en-tête « Leçon i / N ».
- **Lecteur vidéo réservé** (`.lplayer`, ratio 16/9, dégradé du cours) avec un gros bouton
  play. **Emplacement vidéo à remplir plus tard** : au clic, afficher un toast
  « Vidéo de démonstration — le contenu réel sera hébergé ici. » (voir §9.4 pour l'évolution
  vers un vrai `<iframe>` YouTube).
- Titre de la leçon (serif) + méta (durée · nom du module).
- **Corps de la leçon** : le texte pédagogique réel (paragraphes). Pour les cours écrits
  (IA), c'est le contenu de §9 ; pour les cours vidéo (gratuits), un court texte
  d'accompagnement générique (voir `LESSON_BODY`, §7).
- Bouton « Marquer comme terminée » (si non faite) → `App.completeLesson` (+10 points,
  message spécial si le cours atteint 100 %). Bouton « Leçon suivante » si applicable.

### 5.5 `my` (Mes cours)
- En-tête « Mes cours ». Si aucun cours inscrit : bloc `.empty` avec bouton « Voir les
  cours ». Sinon, liste de cartes `.mccard` (vignette dégradé + titre + barre de
  progression + « P % · formateur » ou « Terminé 🎓 »). Clic → `learn`.

### 5.6 `feed` (Communauté)
- En-tête : titre « Communauté » + « N membres · entraide et victoires » + bouton
  classement (icône award).
- Zone de composition factice (`.compose`) : avatar + « Partage une question ou une
  victoire… » → ouvre l'écran `compose` (exige un compte).
- Chips de catégories : `['Tout', ...COMMU_CATS]` (voir §7).
- Fil : posts filtrés par catégorie, triés par date décroissante. Chaque `.post` : en-tête
  (avatar, auteur, rôle · ancienneté, pastille catégorie), texte, actions (j'aime avec
  compteur, commentaires avec compteur). Cliquer la carte (hors boutons) → `post`.

### 5.7 `post` (détail d'une publication)
- Retour + « Publication ». La carte du post en entier, puis « Commentaires · N », la
  liste des commentaires (avatar + bulle + ancienneté), et une **barre de saisie fixe**
  (`.cbar`) : input + bouton envoyer. Entrée ou clic → `App.comment(postId)` (+2 points).

### 5.8 `leader` (classement de la semaine)
- Retour + titre. Texte d'explication du barème. Liste `LEADERS` (§7) + l'utilisateur
  courant (`nom (toi)`, points = `S.points`), triée par points décroissants. Rang 1-3 en
  ambre. La ligne de l'utilisateur est surlignée.

### 5.9 `compose` (nouvelle publication)
- Croix (annuler) + « Nouvelle publication ». Sélecteur de catégorie (chips `COMMU_CATS`,
  premier actif), `textarea`, bouton « Publier » → `App.publish` (+5 points, retourne au
  fil sur « Tout »).

### 5.10 `profil`
- Si connecté : carte profil (avatar, nom, « Membre de la communauté Kalan ») ; 3 stats
  (points en ambre, cours suivis, cours terminés) ; section « Mes informations » (WhatsApp,
  e-mail). Si non connecté : carte d'invitation + bouton « Créer mon compte »
  (`App.enrollGeneric`).
- Section « Application » : bouton **Thème** (cycle Auto → Sombre → Clair), ligne « Mode
  démo · aucune donnée envoyée », bouton **Réinitialiser la démo** (confirm + reload).
- Note de bas de page : rappel démo + « en production, paiements via un agrégateur mobile
  money (CinetPay, PayDunya, FedaPay…) ».

---

## 6. Parcours en overlay (`#overlay`, `renderFlow()`)

Variable globale `flow` :
`{ type:'enroll'|'pay'|'welcome', courseId, step, data:{}, err }`.
Quand `flow` est non-null, bloquer le scroll du body ; sinon vider `#overlay`.

### 6.1 Inscription façon Tally (`type:'enroll'`)
Étapes = 4 questions + 1 récapitulatif. Barre de progression en haut
(`largeur = 100 * step / (nbQuestions+1)`).

Définition des questions (`enrollSteps()`), **une par écran** :
1. `prenom` — « Ton prénom ? » / aide « Comme on t'appelle tous les jours. » /
   placeholder « Ex. Awa » / valide si ≥ 2 lettres, sinon « Entre au moins 2 lettres. »
2. `nom` — libellé dynamique « Enchanté {prenom} ! Ton nom de famille ? » / aide « Il
   apparaîtra sur ton certificat. » / « Ex. Kouassi » / ≥ 2 lettres.
3. `whatsapp` — « Ton numéro WhatsApp ? » / aide « Pour recevoir tes accès et les rappels
   de cours. Jamais de spam. » / **champ téléphone** = `<select>` indicatif (`PREFIXES`,
   défaut `+225`) + input `tel` / valide si ≥ 8 chiffres, sinon « Ce numéro semble trop
   court. »
4. `email` — « Ton adresse e-mail ? » / aide « Pour retrouver ton compte et recevoir ton
   reçu. » / « awa@exemple.com » / regex `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$`, sinon « Vérifie le
   format de l'adresse (ex. nom@gmail.com). »

Comportement :
- Le corps affiche `qnum` (numéro + flèche), `qlabel` (serif), `qhelp`, l'input géant
  (`.qinput`, soulignement qui passe en primaire au focus), et une ligne d'erreur `#ferr`.
- **Entrée** valide l'étape (`App.flowNext`). Bouton bas « OK ✓ » + indice « appuie sur
  Entrée ↵ ». Le champ reçoit le focus automatiquement.
- Retour : flèche si `step>0` (sauvegarde la saisie et recule), croix sinon (ferme).
- Étape récapitulative : liste prénom / nom / WhatsApp (indicatif + numéro) / e-mail +
  phrase « Tu t'inscris à "{titre}" — {prix|gratuit} » ; bouton « Confirmer mon
  inscription ».
- À la confirmation : créer `S.user`, **+20 points** (récompense d'inscription), puis :
  - cours payant → enchaîner sur le **parcours paiement** (`type:'pay'`), numéro
    pré-rempli avec le WhatsApp ;
  - cours gratuit → `finishEnroll(courseId)` (inscrit, crée l'entrée `done`) puis écran de
    bienvenue ;
  - inscription générique (depuis Profil/communauté, `courseId=null`) → écran de bienvenue.

### 6.2 Paiement mobile money simulé (`type:'pay'`)
Sous-étapes `['op','confirm','wait','done']`, barre de progression proportionnelle.
Opérateurs (`OPERATORS`, §7) : Wave, Orange Money, MTN MoMo, Moov Money — chacun avec un
logo carré coloré (initiales), un nom et une note (« Confirmation par code #144# », etc.).

1. `op` — « Comment veux-tu payer ? » + rappel du cours et du montant. Liste `.op`
   sélectionnables (radio). Bouton « Continuer » **désactivé** tant qu'aucun opérateur.
2. `confirm` — « Ton numéro {opérateur} ? » + aide sécurité (« Ne partage jamais ce
   code. »). Champ téléphone (indicatif + numéro, pré-rempli). Récap « Montant à payer ».
   Bouton « Payer {montant} ». Validation ≥ 8 chiffres.
3. `wait` — écran d'attente : spinner, « Demande envoyée à {opérateur} », consigne
   « Compose ton code secret… », le numéro en `.ussd`, note « Mode démo : la confirmation
   est automatique dans quelques secondes. » La croix de fermeture est **désactivée**
   pendant l'attente. Après ~2,8 s : générer une référence
   `ref = 'KL-' + Date.now().toString(36).toUpperCase().slice(-7)` et passer à `done`.
4. `done` — grand check, « Paiement confirmé 🎉 », **reçu** (`.receipt`) : cours, montant,
   opérateur, numéro, référence, date (`fr-FR`, longue). Note « Reçu de démonstration —
   aucun argent réel n'a été débité. » Bouton « Commencer le cours » → inscrit réellement
   (`S.enrolled[courseId] = {at, paid:true, op, ref}`) et ouvre `learn`.

### 6.3 Écran de bienvenue (`type:'welcome'`)
Grand check, « Bienvenue {prénom} ! 🎉 », message contextuel (cours confirmé / compte
créé), bouton « Commencer le cours » (→ `learn`) ou « Découvrir les cours » (→ onglet Cours).

---

## 7. Données de démonstration (constantes)

### 7.1 Catégories & opérateurs
```js
const CATS = ['Tout','IA','Anglais','Business','Vente','Design','Finances','Langues'];
const COMMU_CATS = ['Général','Entraide','Victoires','Annonces'];
const PREFIXES = [
  ['+225',"Côte d'Ivoire"],['+221','Sénégal'],['+223','Mali'],['+226','Burkina Faso'],
  ['+229','Bénin'],['+228','Togo'],['+224','Guinée'],['+227','Niger'],
  ['+237','Cameroun'],['+233','Ghana'],['+243','RD Congo'],['+241','Gabon'],
];
const OPERATORS = [
  {id:'wave', name:'Wave',          col:'#1DC8FF', note:'Sans frais supplémentaires',      tag:'W'},
  {id:'om',   name:'Orange Money',  col:'#F16E00', note:'Confirmation par code #144#',      tag:'OM'},
  {id:'momo', name:'MTN MoMo',      col:'#FFCB05', note:'Confirmation par code *133#',      tag:'MoMo', dark:true},
  {id:'moov', name:'Moov Money',    col:'#0066B3', note:'Confirmation par code *155#',      tag:'MM'},
];
```

### 7.2 Texte d'accompagnement générique des leçons vidéo (`LESSON_BODY`)
Utilisé pour les leçons des **cours gratuits YouTube** (celles sans texte rédigé propre) :
```
1) "Dans cette leçon, on va droit au but : tu découvres la méthode, tu vois un exemple
    réel, puis tu passes à l'action avec un exercice simple."
2) "Prends de quoi noter (le bloc-notes de ton téléphone suffit). L'objectif n'est pas de
    tout retenir, mais d'appliquer une chose concrète dès aujourd'hui."
3) "💡 Conseil : si un point n'est pas clair, pose ta question dans l'espace Entraide de la
    communauté — un formateur ou un autre apprenant te répondra vite."
```

### 7.3 Fil communauté (`SEED_POSTS`) et classement (`LEADERS`)
Reproduire 7 publications de démonstration, en français, ancrées dans le contexte (petits
business, WhatsApp, pub à petit budget, régularité d'apprentissage, sécurité mobile money),
réparties sur les catégories `Annonces / Victoires / Entraide / Général`, avec des `likes`
et quelques `comments`. Les `at` sont des **offsets** relatifs (ex. `2*H`, `D`, `3*D` avec
`H=3600e3`, `D=24*H`) convertis en timestamps absolus au premier chargement.

Auteurs récurrents (à réutiliser comme formateurs, voir §9) : Aïcha Diallo, Moussa Traoré,
Fatou Ndiaye, Yao Kouadio, Aminata Koné, Kofi Mensah ; apprenants : Ibrahim Sow, Mariam
Coulibaly, Awa Kouassi.

`LEADERS` = 5 entrées `{name, pts}` (ex. Ibrahim Sow 340, Awa Kouassi 285, Mariam Coulibaly
210, Sekou Camara 180, Fatim Ouattara 145). L'utilisateur courant est ajouté dynamiquement.

> Le contenu exact des posts est laissé à l'agent : rester cohérent avec le ton (concret,
> bienveillant, local) et les catégories. 5 à 8 posts suffisent.

### 7.4 Règles de gamification (points)
- Inscription complétée (création du compte) : **+20**
- Leçon marquée terminée : **+10**
- Publication créée : **+5**
- Commentaire posté : **+2**
À 100 % d'un cours : toast « 🎓 Cours terminé, félicitations ! ».

---

## 8. Actions (objet `App`, exposé sur `window`)

Méthodes attendues (noms référencés par le HTML et les tests) :
`tab, search, cat, commuCat, openCourse, openLearn, openLesson, toast,` (navigation)
`enroll, enrollGeneric, flowClose, flowBack, flowSaveInput, flowNext, finishEnroll,
welcomeGo,` (inscription)
`payPick, payNext, paySend, payDone,` (paiement)
`completeLesson,` (apprentissage)
`like, openPost, goLeader, compose, pickCat, publish, comment,` (communauté)
`toggleTheme, reset` (profil).

Règles importantes :
- `openLesson(cid,k)` : si non inscrit → déclenche `enroll(cid)` ; sinon ouvre la leçon.
- `enroll(cid)` : si `S.user` existe → paiement direct (payant) ou `finishEnroll` (gratuit) ;
  sinon lance le flow Tally.
- `flowClose()` : interdite pendant l'étape `wait` du paiement.
- `paySend()` : re-valide le numéro, passe à `wait`, `setTimeout` ~2,8 s → `done` avec `ref`.
- `search(v)` : met à jour `filters.q`, re-rend, **restaure le focus** dans l'input.
- `toggleTheme()` : cycle `null → 'dark' → 'light' → null`, `save()`, `applyTheme()`, `render()`.

---

## 9. CONTENU DES COURS (le cœur du test grandeur nature)

Objectif de cette phase : passer d'un catalogue de démonstration à **de vrais cours**,
simples et en français, pour deux domaines : **Intelligence artificielle** et **Anglais**.

Modèle de données d'un cours (tableau `COURSES`) :
```js
{
  id, title, cat, price,          // price en FCFA, 0 = gratuit
  g,                              // index de dégradé 0..5
  instr, instrRole, rating, students, dur,
  desc,                           // 1-2 phrases
  learn: [ '...', '...' ],        // "ce que tu vas apprendre" (4 puces)
  youtube: 'VIDEO_ID' | null,     // si cours vidéo : id YouTube par défaut (optionnel)
  modules: [
    { t:'Titre du module', l:[
        // leçon = [titre, durée, texte?, videoId?]
        ['Titre de la leçon', '8 min', 'Texte pédagogique en français…', 'YT_ID_ou_null'],
        ...
    ]}
  ]
}
```
> Extension du modèle par rapport à la V1 : chaque leçon peut porter un **texte rédigé**
> (3e élément) et un **id vidéo** (4e élément). Le rendu de `lesson` (§5.4) utilise le texte
> s'il existe, sinon `LESSON_BODY` ; et affiche l'`iframe` YouTube si un id est présent,
> sinon le lecteur réservé `.lplayer`.

### 9.1 Cours GRATUIT #1 — « Comprendre l'IA en 30 minutes » (domaine IA)
- `cat:'IA'`, `price:0`, `g:0`, `dur:'~30 min'`, formateur : *Équipe Kalan*.
- Monté à partir de **vraies vidéos YouTube francophones** (les leçons intègrent les vidéos ;
  le texte d'accompagnement reste court). **Vérifier chaque id via l'oEmbed YouTube** avant
  publication (`https://www.youtube.com/oembed?url=…&format=json` doit répondre 200) et
  retirer/remplacer toute vidéo indisponible. Candidats repérés (à revérifier) :
  - « C'est quoi l'intelligence artificielle ? — 1 jour, 1 question » (`ourd-ZeOl78`).
  - Une explication « IA expliquée simplement » récente.
- Programme suggéré (3 modules courts) :
  1. **C'est quoi l'IA ?** (vidéo + « L'IA en une phrase », « IA, machine learning, IA
     générative : les mots simples »).
  2. **Ce que l'IA sait (et ne sait pas) faire** (« Exemples concrets au quotidien »,
     « Les limites à connaître »).
  3. **Et au travail ?** (« Là où l'IA t'aide vraiment », « La suite : ChatGPT, Claude,
     Copilot » — pont vers les cours payants).
- Chaque leçon : `videoId` (si dispo) + 2-3 phrases d'accompagnement.

### 9.2 Cours GRATUIT #2 — « Anglais : bien démarrer » (domaine Anglais)
- `cat:'Anglais'`, `price:0`, `g:2`, `dur:'~40 min'`, formateur : *Équipe Kalan*.
- Monté à partir de vidéos YouTube francophones d'anglais débutant (revérifier les ids).
  Thèmes : se présenter, les 100 mots les plus utiles, les phrases de tous les jours,
  poser une question simple.
- Programme suggéré :
  1. **Se présenter** (« Hello, my name is… », « Dire d'où tu viens et ce que tu fais »).
  2. **Le vocabulaire de survie** (« Les mots les plus fréquents », « Les nombres et
     l'heure »).
  3. **Les phrases utiles** (« Au téléphone / en message », « Poser une question polie »).

> Les deux cours gratuits **agencent** du contenu YouTube ; ils ne contiennent pas de long
> texte rédigé. Leur valeur = curation + parcours clair + progression + communauté.

### 9.3 Cours PAYANTS — « L'IA au travail » (rédigés intégralement, lisibles sans vidéo)
Cible commune : **employés et futurs employés**. Angle : **comment utiliser l'IA vraiment,
au quotidien, dans un vrai poste de travail** (bureautique, communication, organisation).
Ton : simple, concret, sans jargon, chaque leçon donne un exemple et un mini-exercice
« À toi de jouer ». **Chaque leçon a un emplacement vidéo réservé** (à tourner plus tard) —
le texte doit se suffire à lui-même.

Trois cours, **même ossature pédagogique en 4 modules**, décliné par outil :
- **Cours A — « ChatGPT au travail »** (`cat:'IA'`, `g:1`, prix ex. 5 000 FCFA).
- **Cours B — « Claude au travail »** (`cat:'IA'`, `g:3`, prix ex. 5 000 FCFA).
- **Cours C — « Copilot au travail (Microsoft 365) »** (`cat:'IA'`, `g:4`, prix ex. 5 000 FCFA).

Ossature commune (adapter les spécificités de chaque outil, voir §9.3.5) :
- **Module 1 — Prendre l'outil en main** : ce que c'est, à quoi ça sert au bureau, comment
  y accéder (gratuit vs payant), l'interface en 2 minutes, ta toute première demande.
- **Module 2 — Bien demander (la compétence clé)** : la structure d'une bonne consigne
  (rôle + tâche + contexte + format), donner des exemples, itérer/corriger, régler le ton
  et la longueur.
- **Module 3 — Cas d'usage réels au travail** : rédiger et répondre aux e-mails ; résumer un
  document ou une réunion ; créer un tableau / une liste / un plan ; préparer une
  présentation ; traduire et corriger ; brainstormer et décider.
- **Module 4 — Utiliser l'IA de façon fiable et responsable** : vérifier les réponses
  (l'IA peut se tromper), confidentialité (ce qu'on ne colle jamais), politique de
  l'entreprise, garder son esprit critique, prendre de bonnes habitudes.

Le **texte complet rédigé** de ces leçons est fourni en annexe **§12** (prêt à copier dans
le champ `texte` de chaque leçon). L'agent doit intégrer ces textes tels quels.

#### 9.3.5 Spécificités par outil (à refléter dans le Module 1 et les exemples)
- **ChatGPT (OpenAI)** : accès sur chat.openai.com / app mobile ; version gratuite (GPT
  récent limité) vs abonnement ; fonctions utiles au bureau : GPT personnalisés, analyse
  de fichiers, vision, voix. Insister sur la polyvalence et le « chat » itératif.
- **Claude (Anthropic)** : accès sur claude.ai / app ; réputé pour les **textes longs**,
  l'**analyse de documents**, la **nuance** et le **ton naturel** ; fonctionnalités
  **Projects** (regrouper un contexte de travail) et **Artifacts** (produire un document/
  tableau/mini-outil à côté du chat). Insister sur les documents professionnels soignés et
  l'analyse de gros fichiers.
- **Copilot (Microsoft 365)** : **intégré dans les outils que l'entreprise utilise déjà** —
  Word (rédiger/reformuler), Excel (analyser, formules, tableaux), Outlook (trier et
  répondre aux e-mails), PowerPoint (générer une présentation), Teams (résumer une
  réunion). Insister sur « l'IA là où tu travailles déjà », et sur la version
  professionnelle liée au compte de l'organisation.

### 9.4 Intégration vidéo (leçons vidéo)
Quand une leçon possède un `videoId`, remplacer le lecteur réservé par :
```html
<div class="lplayer" style="padding:0;overflow:hidden">
  <iframe width="100%" height="100%" style="border:0;aspect-ratio:16/9"
    src="https://www.youtube-nocookie.com/embed/VIDEO_ID"
    title="Vidéo de la leçon" loading="lazy"
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
    allowfullscreen></iframe>
</div>
```
Utiliser le domaine `youtube-nocookie.com`. **Ceci ouvre une connexion réseau externe** :
c'est acceptable pour l'app réelle (fichier ouvert dans un navigateur), mais **incompatible
avec un Artifact claude.ai** (CSP stricte). Pour une démonstration en Artifact, garder le
lecteur réservé `.lplayer` (placeholder). Sans `videoId`, toujours afficher le placeholder.

---

## 10. Tests d'acceptation (Playwright)

Un script `test.js` (Node + Playwright, Chromium) doit passer **tous** les scénarios
ci-dessous sur `file:///…/index.html`, viewport 390×844, **sans aucune erreur console/page**.
Lancer Chromium via `chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })` si un
Chromium système est présent, sinon installation Playwright standard.

Scénarios (adapter les comptes attendus au nombre réel de cours) :
1. Catalogue affiché (cartes `.ccard` présentes) ; recherche filtre ; filtre par catégorie.
2. Détail d'un cours payant : le bouton `.ctabar .btn` contient « S'inscrire ».
3. Inscription Tally : prénom (« Awa ») → écran « Enchanté Awa » ; validation refuse un
   champ trop court (`#ferr` mentionne « 2 lettres ») ; nom ; WhatsApp ; e-mail invalide
   refusé (`#ferr` mentionne « format ») puis e-mail valide ; récapitulatif → confirmation.
4. Paiement : bouton « Continuer » désactivé tant qu'aucun opérateur ; choix Wave ; numéro
   pré-rempli ; envoi → spinner ; reçu affiché avec référence « KL- ».
5. Espace d'apprentissage ouvert ; ouvrir une leçon → « Marquer comme terminée » →
   « Leçon terminée » ; **+10 points**.
6. Communauté : fil avec ≥ 5 posts ; liker (classe `.liked` appliquée) ; commenter (le
   commentaire apparaît) ; publier (catégorie Victoires ; le post apparaît) ; classement
   affiche la ligne « (toi) ».
7. Mes cours affiche le cours inscrit ; Profil affiche le nom ; **total de points cohérent**
   avec le barème (inscription 20 + leçon 10 + commentaire 2 + publication 5 = 37 dans le
   scénario de référence).
8. Persistance : après `reload`, l'utilisateur et son cours sont toujours là.
9. Cours gratuit : inscription **directe sans paiement** (bouton « gratuitement » → écran de
   bienvenue → espace d'apprentissage).
10. Thème : bascule vers sombre (`document.documentElement.dataset.theme === 'dark'`).

---

## 11. Livraison & exécution

- **Tester** : ouvrir `index.html` (double-clic) ou `python3 -m http.server 8080` →
  `http://localhost:8080` (mode mobile des DevTools recommandé).
- **Réinitialiser** : bouton dans Profil, ou vider la clé `kalan-v1` du `localStorage`.
- **Dépôt** : le fichier vit à la racine. Commits en français, messages descriptifs.
- **README.md** : présente le produit, comment tester, les choix issus de la recherche, et
  le chemin vers la production (backend + agrégateur mobile money + hébergement vidéo +
  notifications WhatsApp).
- **Vers la production** (hors périmètre de la démo) : backend (comptes, cours, paiements —
  ex. Next.js + Postgres/Supabase) ; agrégateur mobile money (CinetPay, PayDunya, FedaPay,
  Paystack) avec webhooks ; hébergement vidéo (Mux, Cloudflare Stream, YouTube non
  répertorié) ; notifications via l'API WhatsApp Business.

---

## 12. Annexe — Texte intégral des cours IA payants

> Copier chaque bloc « Leçon » dans le champ texte de la leçon correspondante. Les durées
> sont indicatives. Le style est volontairement simple, concret, avec un exemple et un
> mini-exercice « À toi de jouer ». Ces textes sont conçus pour être **compréhensibles sans
> vidéo**.

Cette annexe est fournie dans le fichier compagnon **`COURS-IA.md`** (même dépôt) pour
garder ce cahier des charges lisible. Codex doit intégrer le contenu de `COURS-IA.md` dans
le tableau `COURSES` selon le modèle de §9.
