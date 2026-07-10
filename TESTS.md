# Boyia — Plan de tests manuel

Tout se teste depuis **ta machine**. Prérequis : [Node.js 20+](https://nodejs.org) et Git.

## 0. Installation et démarrage

```bash
git clone https://github.com/faety/contrat-test.git
cd contrat-test
git checkout claude/boyia-app-web-o3p6bm
./demo.sh
```

> **Windows** (sans bash) : ouvre deux terminaux —
> Terminal 1 : `cd api && npm install && npm run dev`
> Terminal 2 : `npm install && npm run dev`

Quand c'est prêt :

| Quoi | URL |
|---|---|
| Application | http://localhost:3000 |
| Administration | http://localhost:3000/admin |
| Documentation API (Swagger) | http://localhost:4000/docs |

**Comptes de démonstration** (fictifs) :

| Rôle | Identifiants |
|---|---|
| Utilisatrice (Awa Kouassi) | `+2250700000042` / PIN `1234` |
| Administrateur | `admin@boyia.ci` / `Boyia!Admin2026` |
| OTP d'inscription (démo) | `123456` |

La base SQLite est créée et peuplée automatiquement au premier lancement de l'API
(`api/data/boyia.sqlite`). Pour repartir de zéro : arrête l'API, supprime ce fichier, relance.

---

## 1. Parcours utilisateur

### 1.1 Connexion et accueil
- [ ] Ouvre http://localhost:3000 → landing page avec l'avertissement réglementaire en bas
- [ ] « Se connecter » → `+2250700000042` / PIN `1234`
- [ ] L'accueil affiche **Awa**, son solde réel (≈ 1 300–1 400 ʙ) et sa valeur indicative en FCFA
- [ ] L'œil 👁️ masque/affiche le solde (préférence conservée après rechargement)
- [ ] Les dernières transactions affichent de vrais noms (Christ Aaron, Boyia Market…)

### 1.2 Transfert réussi
- [ ] Accueil → **Envoyer** → tape `@christ.aaron` → « Vérifier le destinataire »
- [ ] La fiche du destinataire s'affiche (nom, @pseudo, téléphone masqué)
- [ ] Montant `25` → l'équivalent FCFA s'affiche → Continuer
- [ ] Le résumé rappelle le caractère définitif → PIN `1234` → Confirmer
- [ ] Écran de succès → « Voir le reçu » → reçu avec référence `BY-…`, QR de vérification
- [ ] Retour à l'accueil : le solde a diminué de 25 et la transaction apparaît en tête

### 1.3 Sécurités du transfert (tout est vérifié PAR LE SERVEUR)
- [ ] Même parcours avec PIN `9999` → **« Code PIN incorrect »** (rejet serveur)
- [ ] Montant `501` → rejet : limite par transfert (500 ʙ)
- [ ] Montant supérieur au solde → rejet : solde insuffisant
- [ ] Destinataire inexistant (`@personne`) → « Destinataire introuvable »
- [ ] Enchaîne plusieurs transferts jusqu'à dépasser 1 000 ʙ dans la journée → rejet : limite quotidienne

### 1.4 Paiement QR chez un commerçant
- [ ] Onglet **Scanner** (bouton central) → « Simuler un scan »
- [ ] Fiche Boyia Market (partenaire vérifié ✓), montant 4 500 FCFA,
      répartition **mixte** : max 30 % en Boyia, le reste en FCFA
- [ ] PIN `1234` → paiement confirmé → reçu disponible

### 1.5 Inscription complète (le moteur de récompenses tourne)
- [ ] Profil → « Se déconnecter » → « S'inscrire »
- [ ] Remplis le formulaire avec un **nouveau numéro** (ex. `+2250799887766`), choisis un PIN
- [ ] Étape OTP → code `123456`
- [ ] Tu arrives sur l'accueil de ton nouveau compte avec **20 ʙ déjà crédités**
      (règle « Inscription complétée » appliquée automatiquement à la vérification)
- [ ] L'historique montre la récompense
- [ ] Refais un transfert avec TON PIN (pas 1234) pour vérifier qu'il est bien individuel

### 1.6 Divers
- [ ] **Recevoir** : QR + @pseudo de TON compte (bouton copier)
- [ ] **Portefeuille** : 4 catégories de soldes, limites du compte, filtres d'historique
- [ ] **Profil** : niveau de vérification réel (niveau 1), langue FR/EN (toute l'app bascule),
      thème clair/sombre/système
- [ ] Coupe l'API (Ctrl+C côté API) puis navigue → message d'erreur clair, pas d'écran cassé

---

## 2. Interface d'administration

Ouvre http://localhost:3000/admin → `admin@boyia.ci` / `Boyia!Admin2026`

### 2.1 Tableau de bord
- [ ] Tuiles : utilisateurs, Boyia émis / en circulation, transactions, volume
- [ ] **« Registre comptable : Équilibré — somme des écritures : 0 »** en vert
- [ ] Fonctions réglementées (§37) toutes « 🔒 Désactivée »
- [ ] Les dernières transactions correspondent à ce que tu viens de faire côté utilisateur

### 2.2 Attribution de Boyia
- [ ] **Utilisateurs** → cherche « Awa » → 🎁 Attribuer → `75` ʙ + un motif → Attribuer
- [ ] Le solde d'Awa augmente de 75 dans le tableau
- [ ] Côté app utilisateur (autre onglet, connecté en Awa) : recharge → le solde a monté
      et la récompense apparaît dans l'historique
- [ ] Tableau de bord : « Boyia émis » a augmenté de 75, registre toujours équilibré

### 2.3 Blocage d'un compte
- [ ] **Utilisateurs** → Bloquer le compte créé au 1.5
- [ ] Déconnecte/reconnecte ce compte côté app → **connexion refusée** (« Compte inactif ou suspendu »)
- [ ] Réactive-le → la connexion refonctionne

### 2.4 Contrepassation
- [ ] **Transactions** → choisis un transfert « Confirmée » → ↩ Contrepasser → motif obligatoire
- [ ] Une nouvelle transaction `reversal` apparaît, l'originale passe à « Contrepassée »
- [ ] Les soldes des deux parties sont restaurés (vérifie côté app)
- [ ] Impossible de contrepasser deux fois la même transaction
- [ ] Registre toujours équilibré sur le tableau de bord

### 2.5 Règles de récompense
- [ ] **Règles de récompense** → crée une règle (nom, déclencheur, montant, budget)
- [ ] Mets « Inscription complétée » **en pause** → refais une inscription (1.5) →
      le nouveau compte démarre à **0 ʙ**
- [ ] Réactive la règle → une nouvelle inscription redonne 20 ʙ

### 2.6 Journal d'audit
- [ ] **Journal d'audit** : chaque action ci-dessus y figure — `boyia.grant`,
      `user.status.change`, `transaction.reverse`, `reward-rule.status.change` —
      avec acteur, entité, détails et IP

### 2.7 Cloisonnement des rôles
- [ ] Dans Swagger (http://localhost:4000/docs), « Authorize » avec le jeton d'**Awa**
      (récupéré via `POST /v1/auth/login`) puis appelle `GET /v1/admin/dashboard` → **403**

---

## 3. Tests automatisés (garanties financières)

```bash
cd api
npm test
```

- [ ] **9 tests verts** : équilibre du journal, écriture déséquilibrée refusée,
      double dépense impossible, idempotence, échec sans effet sur les soldes,
      contrepassation unique, transitions d'état interdites, concurrence, limites

```bash
cd api && npm run typecheck   # TypeScript strict, zéro erreur
cd ..  && npm run typecheck   # idem côté web
npm run build                 # build de production Next.js
```

---

## 4. Tests API bruts (optionnel, avec curl)

```bash
# Jeton d'Awa
TOKEN=$(curl -s -X POST http://localhost:4000/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"phoneNumber":"+2250700000042","pin":"1234"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["accessToken"])')

# Solde (calculé par le registre, jamais par le client)
curl -s http://localhost:4000/v1/wallet/balances -H "Authorization: Bearer $TOKEN"

# Idempotence : exécute DEUX FOIS la même commande → même référence, un seul débit
curl -s -X POST http://localhost:4000/v1/wallet/transfers \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -H 'Idempotency-Key: ma-cle-unique-1' \
  -d '{"recipient":"@christ.aaron","amount":10,"pin":"1234"}'

# Montant négatif → 400 ; sans jeton → 401
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:4000/v1/wallet/transfers \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"recipient":"@christ.aaron","amount":-5,"pin":"1234"}'
```

---

## Résultat attendu en fin de session

Quoi que tu aies fait (transferts, attributions, contrepassations, blocages,
inscriptions), le tableau de bord admin doit TOUJOURS afficher
**« Registre comptable : Équilibré — somme des écritures : 0 »**.
C'est l'invariant central du système (§7 du cahier des charges).
