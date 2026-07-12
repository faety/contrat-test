# Contenu intégral — cours IA « au travail » (Kalan)

Contenu **prêt à intégrer** dans le tableau `COURSES` de `index.html` (voir `BRIEF-CODEX.md`
§9). Trois cours payants, même ossature en 4 modules, déclinée par outil. Chaque leçon est
rédigée en français simple, avec un exemple concret et un mini-exercice « À toi de jouer ».
Elles sont **compréhensibles sans vidéo** (l'emplacement vidéo reste réservé pour plus tard).

Cible : employés et futurs employés. Angle : usage **réel et quotidien** au travail.

Conventions : `[titre de leçon] (durée)` puis le texte. Le texte va dans le 3e élément du
tuple leçon `['titre','durée','texte', videoId|null]`.

---

## COURS A — « ChatGPT au travail »
- `id:'chatgpt'`, `cat:'IA'`, `price:5000`, `g:1`
- `instr:'Aïcha Diallo'`, `instrRole:'Formatrice IA & bureautique'`, `rating:4.8`,
  `students:0`, `dur:'2 h 10'`
- `desc:"Utilise ChatGPT comme un assistant de bureau : e-mails, comptes rendus, tableaux,
  idées. Des méthodes simples, des exemples de vrai travail, applicables dès aujourd'hui."`
- `learn`:
  - « Accéder à ChatGPT et faire ta première demande utile »
  - « Écrire des consignes claires qui donnent de bons résultats »
  - « Gagner du temps sur tes e-mails, résumés et documents »
  - « Vérifier les réponses et protéger les infos confidentielles »

### Module 1 — Prendre ChatGPT en main

**[C'est quoi ChatGPT, en une phrase (7 min)]**
ChatGPT est un assistant qui écrit et réfléchit avec toi, à partir de tes demandes en
langage normal. Tu lui écris comme tu écrirais à un collègue serviable, et il te répond :
un e-mail rédigé, un texte résumé, une liste d'idées, un tableau, une explication. Ce n'est
pas un moteur de recherche : il ne « cherche » pas une page, il **compose** une réponse en
s'appuyant sur ce qu'il a appris. Conséquence importante : il est excellent pour rédiger,
reformuler, organiser et expliquer, mais il peut se tromper sur des faits précis (on verra
comment vérifier au Module 4). Retiens l'idée clé : ChatGPT fait gagner du temps sur tout ce
qui est **écrire, résumer, structurer et trouver des idées**.
*À toi de jouer : en une phrase, note une tâche écrite qui te prend du temps chaque semaine
(un type d'e-mail, un compte rendu…). C'est ce qu'on va accélérer.*

**[Y accéder : gratuit ou payant (8 min)]**
Va sur chat.openai.com ou installe l'application mobile ChatGPT, puis crée un compte avec
ton e-mail. La **version gratuite** suffit largement pour apprendre et pour la plupart des
tâches de bureau. La **version payante** (abonnement mensuel) donne accès aux modèles les
plus récents, à des limites plus hautes et à des fonctions avancées (analyse de fichiers,
image, voix). Conseil : commence en gratuit, passe au payant seulement si tu l'utilises
tous les jours et que les limites te gênent. Sur mobile comme sur ordinateur, l'usage est le
même : une zone de saisie en bas, la conversation au-dessus.
*À toi de jouer : crée ton compte et ouvre une nouvelle conversation. Tu es prêt pour la
suite.*

**[L'interface en 2 minutes (6 min)]**
Tu n'as besoin que de trois choses. **La zone de message** en bas : tu y écris ta demande et
tu envoies. **La conversation** au centre : tes messages et les réponses s'empilent ; tu peux
continuer à discuter, ChatGPT se souvient de ce qui précède **dans la même conversation**.
**Le bouton « Nouvelle conversation »** : ouvre-le pour changer de sujet, sinon tout se
mélange. Astuce : garde une conversation par grand sujet (ex. « E-mails clients »,
« Compte rendu hebdo ») pour t'y retrouver. Tu peux relire, copier une réponse, ou demander
« refais plus court ».
*À toi de jouer : ouvre une nouvelle conversation et écris simplement « Bonjour, peux-tu
m'aider à rédiger des e-mails professionnels ? ». Observe la réponse.*

**[Ta première demande utile (9 min)]**
Ne commence pas par une question vague. Donne une **vraie petite tâche**. Exemple :
« Rédige un e-mail court et poli pour demander à un fournisseur la date de livraison d'une
commande passée lundi. » Tu obtiens un e-mail prêt à ajuster. Si le résultat n'est pas
parfait, tu **continues la conversation** : « Rends-le plus court », « Ajoute que c'est
urgent mais reste courtois », « Mets-le en français plus simple ». C'est cette allée-retour
qui fait toute la puissance de l'outil. Tu n'as pas à réussir du premier coup.
*À toi de jouer : demande à ChatGPT de rédiger un e-mail réel dont tu as besoin cette
semaine, puis demande-lui une version plus courte.*

### Module 2 — Bien demander : la compétence clé

**[La recette d'une bonne consigne (10 min)]**
Une bonne demande tient en quatre morceaux : **rôle + tâche + contexte + format**.
*Rôle* : « Tu es un assistant commercial. » *Tâche* : « Rédige une relance. » *Contexte* :
« Le client n'a pas répondu à mon devis envoyé il y a 5 jours, il s'appelle M. Koné,
montant 150 000 FCFA. » *Format* : « E-mail de 6 lignes maximum, ton cordial. » Plus tu
donnes de contexte utile, meilleure est la réponse. La différence entre un résultat moyen et
un résultat excellent, c'est presque toujours le **contexte** que tu ajoutes.
*À toi de jouer : reprends ta tâche du Module 1 et réécris ta demande avec les 4 morceaux
(rôle, tâche, contexte, format).*

**[Donner un exemple pour guider le style (8 min)]**
Le moyen le plus rapide d'obtenir le bon ton, c'est de **montrer un exemple**. Colle un
e-mail que tu as déjà écrit et dont tu es content, puis dis : « Écris dans le même style
que cet exemple. » ChatGPT copie la structure, la longueur et le ton. Tu peux aussi dire
« Comme ceci, mais en plus formel » ou « en plus chaleureux ». C'est très utile pour garder
la voix de ton entreprise sur tous tes messages.
*À toi de jouer : colle un de tes anciens e-mails et demande un nouveau message « dans le
même style » pour une autre situation.*

**[Corriger et itérer (8 min)]**
Considère la première réponse comme un **brouillon**, pas comme un résultat final. Tu
l'améliores par petites instructions : « Plus court », « Plus simple », « Enlève le
jargon », « Ajoute une formule de politesse locale », « Propose 3 versions au choix ».
Itérer coûte quelques secondes et transforme une réponse correcte en réponse parfaite. La
plupart des débutants abandonnent après la première réponse : ne fais pas cette erreur,
c'est dans l'aller-retour que se trouve la qualité.
*À toi de jouer : prends une réponse « correcte » et améliore-la en 3 instructions
successives.*

**[Régler le ton et la longueur (7 min)]**
Sois explicite sur ce que tu veux : longueur (« en 5 lignes », « un paragraphe »,
« une page »), ton (« formel », « amical », « direct »), et public (« pour un directeur »,
« pour un client mécontent », « pour un collègue »). Tu peux même demander « en français
simple, phrases courtes ». Ces réglages évitent les textes trop longs ou trop rigides et
te font gagner un temps précieux de relecture.
*À toi de jouer : demande le même message en deux tons différents (formel puis amical) et
compare.*

### Module 3 — Cas d'usage réels au travail

**[E-mails : rédiger et répondre (10 min)]**
C'est l'usage numéro un au bureau. Pour **rédiger** : donne l'objectif et le contexte, ChatGPT
écrit. Pour **répondre** : colle l'e-mail reçu et dis « Rédige une réponse qui accepte la
réunion mais propose jeudi plutôt que mercredi, ton courtois ». Pour les messages délicats
(refus, retard, réclamation), demande « une version diplomate qui garde une bonne relation ».
Tu relis, tu ajustes un détail, tu envoies. Un e-mail qui te prenait 15 minutes en prend 3.
*À toi de jouer : colle un vrai e-mail reçu et fais rédiger une réponse, puis corrige un
détail avant de l'utiliser.*

**[Résumer un document ou une réunion (9 min)]**
Colle un long texte (compte rendu, article, message) et demande : « Résume en 5 points
l'essentiel » ou « Donne-moi les décisions et qui fait quoi ». Pour une réunion, colle tes
notes brutes et demande « un compte rendu clair avec les actions à faire ». Tu peux préciser
le public : « pour envoyer à l'équipe » ou « pour ma direction, en 3 lignes ». Le résumé te
fait gagner un temps considérable et t'évite de rater une information importante.
*À toi de jouer : colle un long message ou tes notes d'une réunion et demande un résumé en 5
points avec les actions à faire.*

**[Créer une liste, un tableau, un plan (9 min)]**
ChatGPT structure très bien l'information. Demande « Fais-moi un tableau à 3 colonnes : tâche,
responsable, échéance » ou « Transforme ce paragraphe en liste à puces » ou « Propose un plan
en 5 parties pour cette présentation ». Tu peux copier le tableau dans Word, Excel ou un
e-mail. C'est parfait pour passer d'idées en vrac à un document propre et organisé.
*À toi de jouer : donne 6 tâches en vrac et demande un tableau tâche / responsable / échéance.*

**[Préparer une présentation ou une prise de parole (8 min)]**
Décris ton sujet et ton public : « Prépare le plan d'une présentation de 10 minutes sur nos
résultats du trimestre, pour l'équipe commerciale, avec 5 diapositives et 3 points par
diapositive. » Tu obtiens une trame que tu remplis. Tu peux aussi demander « les 3 messages à
retenir » ou « une phrase d'accroche pour commencer ». Idéal pour ne plus jamais partir de la
page blanche.
*À toi de jouer : fais préparer le plan d'une présentation que tu dois vraiment faire bientôt.*

**[Traduire et corriger (7 min)]**
Colle un texte et demande « Traduis en anglais professionnel » ou « Corrige les fautes et
améliore le style, sans changer le sens ». Très utile pour écrire à un client étranger, ou
pour relire un document important avant de l'envoyer. Demande toujours de **garder le sens**
et, pour les documents sensibles, relis la traduction (voir Module 4).
*À toi de jouer : fais corriger un texte que tu as écrit, puis demande une version traduite en
anglais.*

### Module 4 — Utiliser ChatGPT de façon fiable et responsable

**[L'IA peut se tromper : toujours vérifier (9 min)]**
ChatGPT peut énoncer une information fausse avec assurance (on appelle ça une
« hallucination »). Il ne faut donc jamais utiliser un **chiffre, une date, une loi, un nom ou
une citation** sans les vérifier à la source. Règle simple : l'IA est fiable pour la **forme**
(rédiger, reformuler, organiser) et à surveiller sur le **fond** (les faits précis). Pour un
document important, garde le réflexe : je fais rédiger par l'IA, je vérifie les faits
moi-même.
*À toi de jouer : repère dans une réponse un élément factuel (chiffre, date) et vérifie-le à
la source avant de t'en servir.*

**[Confidentialité : ce qu'on ne colle jamais (9 min)]**
Ne colle pas d'informations **confidentielles ou personnelles** que ton entreprise ne
voudrait pas voir sortir : mots de passe, données bancaires, numéros de clients, contrats
sensibles, dossiers médicaux. Considère que ce que tu écris peut être utilisé pour améliorer
le service. Astuce pro : **anonymise** avant de coller (remplace les vrais noms et montants
par « Client A », « X FCFA »), puis remets les vraies valeurs dans le résultat. En cas de
doute, demande-toi : « serais-je à l'aise si un tiers le lisait ? »
*À toi de jouer : reprends une demande contenant des infos sensibles et réécris-la en version
anonymisée.*

**[Respecter la politique de ton entreprise (7 min)]**
Beaucoup d'organisations ont des règles sur l'usage de l'IA : outils autorisés, types de
données interdits, obligation de relire. Renseigne-toi avant d'utiliser ChatGPT au travail, et
respecte ces règles. Utiliser l'IA intelligemment, c'est aussi savoir **quand ne pas
l'utiliser** (par exemple pour une décision qui engage la responsabilité de l'entreprise sans
relecture humaine).
*À toi de jouer : liste 2 tâches où tu peux utiliser l'IA librement, et 1 tâche où tu dois
d'abord demander l'accord.*

**[Prendre de bonnes habitudes (8 min)]**
Pour progresser vite : garde tes **meilleures consignes** dans un fichier (tu les réutilises),
travaille par **conversations thématiques**, relis toujours avant d'envoyer, et considère
l'IA comme un assistant que tu diriges — pas comme une autorité. Fixe-toi un objectif simple
cette semaine : automatiser **une** tâche écrite récurrente. La régularité, pas la
perfection, fait la différence.
*À toi de jouer : choisis une tâche à automatiser cette semaine et note la consigne qui
marche le mieux pour la réutiliser.*

---

## COURS B — « Claude au travail »
- `id:'claude'`, `cat:'IA'`, `price:5000`, `g:3`
- `instr:'Yao Kouadio'`, `instrRole:'Consultant productivité & IA'`, `rating:4.9`,
  `students:0`, `dur:'2 h 15'`
- `desc:"Claude excelle sur les textes longs, l'analyse de documents et le ton juste.
  Apprends à en faire ton assistant pour les documents pros, les rapports et l'analyse."`
- `learn`:
  - « Accéder à Claude et comprendre ses points forts »
  - « Faire analyser et résumer de longs documents »
  - « Produire des documents professionnels soignés (avec les Artifacts) »
  - « Organiser ton travail avec les Projects, en toute confidentialité »

### Module 1 — Prendre Claude en main

**[C'est quoi Claude, et ses points forts (8 min)]**
Claude est un assistant IA conçu par Anthropic. Comme les autres, tu lui écris en langage
normal et il te répond. Sa réputation : il est particulièrement bon pour les **textes longs**,
l'**analyse de documents**, la **nuance** et un **ton naturel et professionnel**. Concrètement,
si tu dois lire un rapport de 20 pages, rédiger une note soignée, ou reformuler un message
délicat avec le bon équilibre, Claude est un excellent choix. Le principe d'usage reste le
même que pour tout assistant IA : une bonne demande, du contexte, et des allers-retours.
*À toi de jouer : note un document long que tu dois traiter bientôt (rapport, contrat,
compte rendu). Ce sera ton terrain d'entraînement.*

**[Y accéder : gratuit ou payant (7 min)]**
Va sur claude.ai ou installe l'application, et crée un compte. La **version gratuite** permet
déjà beaucoup (discuter, analyser des documents, rédiger). La **version payante** offre des
limites plus hautes, les modèles les plus performants et les fonctions avancées comme les
**Projects**. Commence en gratuit ; passe au payant si tu traites de gros volumes chaque jour.
L'interface est épurée : une zone de message, la conversation, et la possibilité de
**joindre un fichier**.
*À toi de jouer : crée ton compte et repère le bouton pour joindre un fichier (trombone).*

**[Joindre un document et poser une question (8 min)]**
Le geste le plus utile avec Claude : **joins un fichier** (PDF, Word, texte, tableau) puis
pose ta question dessus. Exemple : joins un rapport et demande « Résume les 5 points clés et
les risques mentionnés » ou « Que dit ce contrat sur les délais de paiement ? ». Claude lit le
document et te répond en s'appuyant dessus. C'est beaucoup plus fiable que de lui demander de
deviner : tu lui donnes la matière, il l'analyse.
*À toi de jouer : joins un document que tu connais et demande un résumé en 5 points. Vérifie
qu'il a bien saisi l'essentiel.*

**[Ta première demande utile (7 min)]**
Commence par une tâche concrète, pas une question vague. Exemple : « Rédige une note interne
d'une demi-page pour annoncer un changement d'horaires à l'équipe, ton clair et rassurant. »
Puis affine : « Ajoute une phrase de remerciement », « Rends-le plus bref ». Comme pour tout
assistant, la première réponse est un brouillon que tu améliores par petites touches.
*À toi de jouer : fais rédiger une note interne réelle, puis demande une version plus courte.*

### Module 2 — Bien demander : la compétence clé

**[La recette d'une bonne consigne (9 min)]**
Structure ta demande : **rôle + tâche + contexte + format**. Exemple : « Tu es responsable RH
(rôle). Rédige un message (tâche) pour féliciter l'équipe après un trimestre difficile mais
réussi (contexte). En 8 lignes, ton chaleureux et sincère (format). » Avec Claude, tu peux
donner **beaucoup de contexte** sans problème : il gère bien les consignes longues et
détaillées. Plus le contexte est riche et précis, plus le résultat est juste.
*À toi de jouer : écris une consigne complète (4 morceaux) pour un message que tu dois envoyer
cette semaine.*

**[Donner un exemple et régler le ton (8 min)]**
Pour obtenir exactement le bon style, montre un exemple : colle un document dont tu es fier et
dis « Écris dans ce style ». Claude est réputé pour bien **capter la nuance** : tu peux
demander « plus diplomate », « plus direct sans être sec », « chaleureux mais professionnel ».
C'est précieux pour les messages sensibles (annonce difficile, réponse à une plainte,
recadrage bienveillant) où le ton fait tout.
*À toi de jouer : fais rédiger un message délicat, puis demande une version « plus diplomate ».*

**[Itérer sur un long texte (8 min)]**
Sur un document long, travaille **section par section** : « Améliore seulement l'introduction »,
« Raccourcis la partie 2 de moitié », « Uniformise le ton sur tout le document ». Tu peux
aussi demander « Relis et signale les incohérences » ou « Propose un titre et un résumé
exécutif ». Cette approche par morceaux donne un contrôle fin sur le rendu final.
*À toi de jouer : prends un texte long et fais améliorer une seule section à la fois.*

### Module 3 — Cas d'usage réels au travail

**[Analyser un long rapport (10 min)]**
Joins un rapport ou un compte rendu volumineux et demande une lecture structurée : « Résume en
une page », « Liste les décisions et les actions avec les responsables », « Quels sont les 3
risques principaux et les solutions proposées ? », « Qu'est-ce qui manque ou reste flou ? ».
Claude est particulièrement à l'aise sur ce type de travail d'analyse. Tu passes de « je dois
lire 30 pages » à « j'ai l'essentiel en 2 minutes, et je vérifie les points clés ».
*À toi de jouer : joins un long document et demande les décisions, les actions et les risques.*

**[Produire un document soigné avec les Artifacts (9 min)]**
Quand tu demandes à Claude de créer un vrai document (une note, un tableau, un modèle de
lettre, une procédure), il peut l'afficher dans un **Artifact** : un panneau à côté de la
conversation où le document prend forme et que tu peux copier ou télécharger. Demande par
exemple « Crée un modèle de compte rendu de réunion réutilisable » ou « Fais un tableau
comparatif de ces 3 offres ». Tu obtiens un livrable propre, prêt à réutiliser, que tu peux
faire évoluer par de simples instructions.
*À toi de jouer : demande un modèle réutilisable (compte rendu, e-mail type, checklist) et
adapte-le à ton équipe.*

**[Rédiger des e-mails et messages justes (8 min)]**
Comme tout assistant IA, Claude rédige et répond aux e-mails. Sa force : le **ton naturel**.
Colle un e-mail reçu et demande « une réponse ferme mais courtoise qui refuse la remise sans
casser la relation ». Pour un message d'équipe, demande « chaleureux et motivant, sans en
faire trop ». Tu relis, tu ajustes, tu envoies.
*À toi de jouer : fais rédiger une réponse à un e-mail difficile en gardant une bonne
relation.*

**[Traduire et adapter au public (7 min)]**
Demande « Traduis en anglais professionnel » ou « Adapte ce message pour un public non
spécialiste ». Claude gère bien les nuances de registre : tu peux demander « garde le sens
exact mais rends-le accessible à quelqu'un qui ne connaît pas le sujet ». Utile pour
communiquer avec des clients étrangers ou vulgariser un sujet technique.
*À toi de jouer : fais adapter un texte technique « pour un public non spécialiste ».*

### Module 4 — Utiliser Claude de façon fiable et responsable

**[Vérifier les faits (8 min)]**
Comme toute IA, Claude peut se tromper sur un fait précis. Quand il analyse un **document que
tu as fourni**, il est plus fiable car il s'appuie sur ta matière — mais vérifie quand même les
chiffres et citations importants dans la source. Pour tout ce qui engage (montant, date, clause
d'un contrat), relis toi-même le passage d'origine. L'IA t'aide à lire vite ; la décision reste
la tienne.
*À toi de jouer : après un résumé, retrouve dans le document d'origine un chiffre cité et
vérifie-le.*

**[Confidentialité et données (9 min)]**
Ne joins pas de documents contenant des données que ton organisation veut garder privées sans
en avoir le droit : données personnelles de clients, contrats confidentiels, dossiers
sensibles. Renseigne-toi sur ce qui est autorisé chez toi. Bonne pratique : **anonymise** les
noms et montants sensibles avant d'analyser, puis réintègre les vraies valeurs dans le
livrable final. En cas de doute, abstiens-toi et demande à ton responsable.
*À toi de jouer : prépare une version anonymisée d'un document avant de l'analyser.*

**[Politique d'entreprise et esprit critique (8 min)]**
Respecte les règles de ton organisation sur l'IA (outils permis, données interdites,
relecture obligatoire). Et garde ton esprit critique : l'IA propose, tu décides. Pour un
livrable qui sort de l'entreprise (offre, contrat, communication officielle), la relecture
humaine est indispensable. Utiliser l'IA de façon professionnelle, c'est l'associer à ton
jugement, pas le remplacer.
*À toi de jouer : identifie un livrable qui exige toujours une relecture humaine chez toi.*

**[Prendre de bonnes habitudes (8 min)]**
Garde tes meilleures consignes de côté, travaille par conversations thématiques, exploite les
Artifacts pour tes documents réutilisables, et si tu passes en payant, range ton travail dans
des **Projects** (regrouper les documents et le contexte d'un même sujet). Objectif de la
semaine : traiter **un** document long avec Claude et gagner une heure.
*À toi de jouer : choisis un document long récurrent et crée le modèle qui te fera gagner du
temps à chaque fois.*

---

## COURS C — « Copilot au travail (Microsoft 365) »
- `id:'copilot'`, `cat:'IA'`, `price:5000`, `g:4`
- `instr:'Aminata Koné'`, `instrRole:'Formatrice bureautique & Microsoft 365'`,
  `rating:4.7`, `students:0`, `dur:'2 h'`
- `desc:"Copilot, c'est l'IA directement dans Word, Excel, Outlook, PowerPoint et Teams.
  Apprends à l'utiliser là où tu travailles déjà pour aller beaucoup plus vite."`
- `learn`:
  - « Comprendre où se trouve Copilot dans Microsoft 365 »
  - « Rédiger et reformuler dans Word, trier tes e-mails dans Outlook »
  - « Analyser des données et créer des tableaux dans Excel »
  - « Résumer une réunion Teams et monter une présentation PowerPoint »

### Module 1 — Prendre Copilot en main

**[C'est quoi Copilot, et sa particularité (8 min)]**
Copilot est l'assistant IA de Microsoft, **intégré directement dans les outils que beaucoup
d'entreprises utilisent déjà** : Word, Excel, Outlook, PowerPoint et Teams. Sa grande force
n'est pas d'être « à part » dans un site web, mais d'être **là où tu travailles**. Dans Word,
il rédige ; dans Outlook, il t'aide à répondre ; dans Excel, il analyse ; dans PowerPoint, il
crée des diapositives ; dans Teams, il résume tes réunions. Tu n'as pas à copier-coller
d'un outil à l'autre : l'IA agit dans ton document.
*À toi de jouer : repère lesquels de ces outils (Word, Excel, Outlook, PowerPoint, Teams) tu
utilises déjà au travail.*

**[Y accéder : une version professionnelle (8 min)]**
Copilot dans Microsoft 365 est généralement une **offre professionnelle** liée au compte de
ton organisation (ton employeur active la licence). Il existe aussi un Copilot grand public
(dans le navigateur Edge et sur copilot.microsoft.com) pour discuter et rédiger, mais
l'intégration dans Word/Excel/Outlook nécessite la licence Microsoft 365 Copilot. Vérifie
auprès de ton service informatique si tu y as accès. Si oui, tu verras un **bouton Copilot**
dans le ruban de tes applications.
*À toi de jouer : demande à ton service informatique (ou vérifie dans une appli Office) si le
bouton Copilot est disponible pour toi.*

**[Où le trouver dans chaque application (7 min)]**
Le principe est constant : cherche l'**icône Copilot** dans le ruban ou sur le côté. Dans
Word, elle apparaît dans la marge pour proposer de rédiger. Dans Outlook, un bouton « Copilot »
au-dessus d'un e-mail propose de résumer ou de répondre. Dans Excel, il ouvre un panneau pour
analyser ton tableau. Dans PowerPoint et Teams, même logique. Une fois que tu as repéré cette
icône, tu sais l'utiliser partout : tu lui écris ta demande en langage normal.
*À toi de jouer : ouvre une application Office et retrouve l'icône Copilot.*

**[Ta première demande utile (7 min)]**
Choisis la tâche la plus fréquente. Dans Word : « Rédige un premier jet de note de service sur
le nouveau règlement des congés. » Dans Outlook : ouvre un e-mail reçu et clique « Résumer ».
Le résultat est un brouillon que tu ajustes. L'énorme avantage : tu restes dans ton document,
sans copier-coller. Tu diriges, Copilot exécute là où tu es.
*À toi de jouer : dans l'outil que tu utilises le plus, fais faire une première tâche simple à
Copilot.*

### Module 2 — Bien demander : la compétence clé

**[La recette d'une bonne consigne (9 min)]**
Même dans Copilot, la qualité vient de ta demande : **tâche + contexte + format**. « Rédige un
e-mail (tâche) pour informer les clients d'une fermeture exceptionnelle vendredi (contexte),
court et rassurant (format). » Copilot a un avantage : il **connaît le contexte de tes
documents et e-mails** (avec ton autorisation), donc tu peux dire « réponds à ce message » ou
« résume ce document » sans tout recopier. Reste précis sur ce que tu veux obtenir.
*À toi de jouer : formule une demande claire (tâche, contexte, format) pour un e-mail réel dans
Outlook.*

**[Reformuler, raccourcir, changer de ton (8 min)]**
Dans Word et Outlook, sélectionne un texte et demande à Copilot de le **reformuler**, le
**raccourcir**, le **rendre plus formel** ou **plus simple**. Exemple : « Reformule ce
paragraphe en langage plus clair et plus court. » C'est idéal pour améliorer un texte existant
sans repartir de zéro. Tu gardes le contrôle : Copilot propose, tu acceptes ou tu ajustes.
*À toi de jouer : prends un paragraphe existant et demande une version plus courte et plus
simple.*

**[Itérer et vérifier avant d'accepter (7 min)]**
Copilot propose souvent un texte que tu peux **insérer, régénérer ou modifier**. Ne clique pas
« insérer » machinalement : relis, demande « une autre version » si besoin, ou précise ta
demande. Comme toute IA, il produit un brouillon de qualité, pas une vérité finale. Le bon
réflexe : générer, relire, ajuster, puis valider.
*À toi de jouer : génère un texte, demande une variante, et choisis la meilleure avant
d'insérer.*

### Module 3 — Cas d'usage réels au travail

**[Word : rédiger et mettre en forme (9 min)]**
Dans Word, Copilot part d'une consigne et écrit un premier jet complet : note de service,
compte rendu, procédure, lettre. Donne le sujet, le public et la longueur. Ensuite, sélectionne
des passages pour les reformuler, ajouter une section, ou résumer un long document en haut de
page. Tu passes de la page blanche à un brouillon structuré en une minute, puis tu peaufines.
*À toi de jouer : fais rédiger dans Word une note dont tu as besoin, puis demande d'ajouter une
section de conclusion.*

**[Outlook : trier et répondre aux e-mails (9 min)]**
Outlook est le gain de temps le plus immédiat. Copilot **résume** un long fil de discussion
(« Résume cette conversation et dis-moi ce qu'on attend de moi »), puis **rédige une réponse**
selon ton intention (« Réponds que j'accepte, mais propose lundi »). Pour une boîte pleine, il
aide à repérer l'essentiel. Tu relis chaque réponse avant de l'envoyer — l'e-mail engage ton
nom.
*À toi de jouer : sur un long fil d'e-mails, demande un résumé puis fais rédiger une réponse
courte.*

**[Excel : analyser des données et créer des tableaux (10 min)]**
Dans Excel, Copilot t'aide à **comprendre tes données** sans être expert en formules. Sur un
tableau de ventes, demande « Quelles sont les 3 tendances principales ? », « Ajoute une colonne
qui calcule la marge », « Crée un tableau récapitulatif par mois » ou « Fais un graphique des
ventes par région ». Il propose des formules et des analyses que tu valides. C'est l'occasion de
tirer de la valeur de tableaux que tu n'avais pas le temps d'exploiter.
*À toi de jouer : sur un tableau de chiffres, demande à Copilot les grandes tendances et un
récapitulatif mensuel.*

**[PowerPoint et Teams : présentations et réunions (9 min)]**
Dans **PowerPoint**, Copilot peut générer une première présentation à partir d'un sujet ou d'un
document Word (« Crée une présentation de 8 diapositives à partir de ce rapport »). Tu obtiens
une trame visuelle à ajuster. Dans **Teams**, il **résume une réunion** : décisions prises,
actions à faire et par qui, points en suspens — même si tu es arrivé en retard ou absent. Deux
usages qui font gagner un temps considérable sur la préparation et le suivi.
*À toi de jouer : à ta prochaine réunion Teams (ou depuis un compte rendu), demande le résumé
avec les actions et les responsables.*

### Module 4 — Utiliser Copilot de façon fiable et responsable

**[Vérifier avant d'envoyer (8 min)]**
Copilot travaille à partir de tes documents et e-mails, ce qui le rend souvent pertinent, mais
il peut mal interpréter ou inventer un détail. Vérifie toujours les **chiffres d'Excel**, les
**faits d'une note** et le **sens d'une réponse** avant de valider. Rien ne part en ton nom sans
ta relecture. L'IA accélère ; la responsabilité reste humaine.
*À toi de jouer : après une analyse Excel, revérifie manuellement un des chiffres proposés.*

**[Confidentialité et périmètre professionnel (9 min)]**
Un point rassurant : dans la version professionnelle Microsoft 365, Copilot travaille dans le
périmètre de ton organisation et respecte les permissions de tes fichiers. Cela ne te dispense
pas de prudence : n'utilise pas Copilot pour extraire ou diffuser des données auxquelles tu n'as
pas droit, et suis les consignes de ton service informatique. Ne colle pas d'informations
sensibles dans une version grand public non gérée par ton entreprise.
*À toi de jouer : note la différence entre le Copilot pro de ton entreprise et un Copilot grand
public, et lequel tu dois utiliser pour le travail.*

**[Respecter la politique de l'entreprise (7 min)]**
Ton organisation peut encadrer l'usage de Copilot : ce que tu peux générer, ce qui doit être
relu, ce qui reste interdit. Renseigne-toi et respecte ces règles. Pour tout document officiel
ou externe, la relecture humaine est la norme. Bien utiliser l'IA, c'est aussi connaître ses
limites et les règles du jeu.
*À toi de jouer : vérifie s'il existe une consigne interne sur l'usage de Copilot chez toi.*

**[Prendre de bonnes habitudes (8 min)]**
Commence par **un** outil (souvent Outlook ou Word), prends le réflexe de cliquer sur Copilot
pour résumer et rédiger, relis toujours, et étends peu à peu aux autres applications. Garde en
tête tes meilleures consignes pour les réutiliser. Objectif de la semaine : gagner 30 minutes
par jour sur tes e-mails grâce au résumé et à la réponse assistée.
*À toi de jouer : choisis un outil et une tâche quotidienne, et utilise Copilot dessus tous les
jours cette semaine.*

---

## Notes d'intégration pour Codex
- Ajouter ces trois cours au tableau `COURSES`, plus les deux cours gratuits (§9.1, §9.2 du
  brief). Prévoir au moins 5 cours au total pour rester cohérent avec les tests (§10).
- Mettre à jour `CATS` pour inclure `IA` et `Anglais` (déjà prévu dans le brief).
- Le champ leçon devient `['titre','durée','texte','videoId'|null]`. Adapter :
  - `lessonCount`, `lessonByKey`, le rendu `lesson` (utiliser le texte s'il existe, sinon
    `LESSON_BODY`; afficher l'iframe si `videoId` non-null et hors contexte Artifact).
- Conserver l'`students:0` pour les nouveaux cours (vrai lancement) ou mettre un petit nombre
  crédible ; garder les cours de démo existants si utile, ou les retirer pour ne garder que
  l'IA et l'anglais selon la décision produit (le test grandeur nature cible IA + anglais).
- Vérifier chaque `videoId` YouTube via oEmbed avant publication ; remplacer les indisponibles.
