# Boyia App — Application Web

> **Boyia — Apprends, entreprends et sois récompensé.**

Application web responsive de la plateforme **Boyia App**, super-application communautaire, éducative et commerciale fondée sur la **Boyia Currency**, une unité numérique interne en circuit fermé (comparable à des points de fidélité évolués — ni banque, ni cryptomonnaie, ni monnaie ayant cours légal).

Le dépôt contient deux applications :

- **`/` (racine)** — l'application web Next.js : parcours utilisateur de démonstration (données fictives §53) **et interface d'administration** (`/admin`) branchée sur l'API réelle.
- **`api/`** — le backend **NestJS** : authentification OTP + JWT, portefeuilles, **registre comptable à double entrée**, transactions idempotentes avec machine à états, règles de récompense, journal d'audit. SQLite en démo, PostgreSQL en production (mêmes entités TypeORM).

## Fonctionnalités

- **Landing page publique** : présentation, offres publiques, avertissement réglementaire (§37)
- **Inscription / connexion** : parcours téléphone + OTP simulé (code démo `123456`)
- **Navigation à 5 onglets** (§11) : Accueil · Découvrir · Scanner · Activités · Profil
- **Accueil** (§12) : solde total masquable, valeur indicative en FCFA, actions rapides, récompenses en attente, dernières transactions, défis, offres recommandées
- **Portefeuille** (§13) : 4 catégories de soldes (disponible, en attente, promotionnel, bloqué), limites du compte, historique filtrable, **reçu numérique** avec QR de vérification
- **Transfert** (§14) : destinataire → montant → résumé → **PIN transactionnel** (démo `1234`) → reçu ; contrôle des limites et du solde, avertissement nouveau destinataire
- **Paiement QR** (§15) : simulation d'un paiement **mixte** (30 % max en Boyia) chez un commerçant vérifié
- **Défis & gamification** (§17) : progression, XP, niveaux, badges
- **Formations** (§18) : microlearning avec récompenses et certificats
- **Découvrir** (§20) : offres et coupons des partenaires par catégorie
- **Profil** : niveau de vérification, badges, parrainage, langue, thème, supervision parentale
- **i18n FR/EN** (§21 des règles), **mode clair/sombre**, **PWA manifest**, mobile-first, accessible (zones tactiles ≥ 44 px, aria, contrastes)

## Valeur de référence

`100 Boyia = 1 000 FCFA` (configurable dans `lib/config.ts` — §6.4). Les fonctions réglementées (achat de Boyia, retrait, Mobile Money…) sont désactivées par **feature flags** (§37).

## Démarrage

```bash
# 1. Backend (port 4000) — base SQLite créée et peuplée automatiquement
cd api && npm install && npm run dev

# 2. Web + admin (port 3000)
npm install && npm run dev
```

- Application : http://localhost:3000 · Administration : http://localhost:3000/admin
- Documentation OpenAPI : http://localhost:4000/docs
- Connexion admin (démo, fictive) : `admin@boyia.ci` / `Boyia!Admin2026`
- Utilisatrice de démo côté API : `+2250700000042` / PIN `1234` (Awa Kouassi)

```bash
npm run typecheck && npm run build   # web
cd api && npm run test               # tests financiers (registre, idempotence, états)
```

## Backend — garanties financières

- **Double entrée (§7)** : chaque opération crée une écriture débit/crédit équilibrée ; la somme globale du registre vaut toujours zéro (vérifiée en continu sur le tableau de bord admin).
- **Soldes calculés, jamais stockés** comme source de vérité (règle 8) ; montants confirmés côté serveur uniquement (règle 9, §35.4).
- **Idempotence (règle 11)** : l'en-tête `Idempotency-Key` sur `POST /v1/wallet/transfers` garantit qu'une requête répétée ne crée pas de double transaction (contrainte unique en base).
- **Machine à états stricte (§33)** : transitions contrôlées ; `COMPLETED` n'est jamais supprimé, seulement `REVERSED` par contrepassation.
- **Audit (règle 18)** : chaque action administrative (attribution, blocage, contrepassation, règles) est journalisée avec acteur, entité, détails et IP.
- **Sécurité** : PIN et mots de passe hachés **Argon2id**, JWT courts + refresh, garde de rôles sur chaque endpoint, validation stricte (`class-validator`, whitelist), CORS restreint, OTP à tentatives limitées.
- **Tests financiers (§42)** : 9 tests Jest couvrent équilibre du journal, double dépense, idempotence, échec sans effet sur les soldes, contrepassation, transitions interdites, concurrence et limites.

## Interface d'administration (`/admin`)

- **Tableau de bord (§25.1)** : utilisateurs, Boyia émis/en circulation, volume, état d'équilibre du registre, fonctions réglementées (feature flags §37), dernières transactions.
- **Utilisateurs (§25.2)** : recherche, blocage/réactivation, **attribution de Boyia** avec motif obligatoire.
- **Transactions (§25.3)** : liste, **contrepassation** avec motif (jamais de suppression).
- **Règles de récompense (§16)** : création sans modifier le code, pause/activation, suivi de budget.
- **Journal d'audit** : trace immuable de toutes les actions administratives.

## Structure

```
app/
├── page.tsx                 # Landing publique
├── connexion/  inscription/ # Authentification (démo)
└── app/                     # Espace connecté
    ├── page.tsx             # Accueil
    ├── portefeuille/        # Soldes, historique, reçus
    ├── envoyer/  recevoir/  # Transferts
    ├── scanner/             # Paiement QR
    ├── decouvrir/           # Offres partenaires
    ├── activites/           # Défis & formations
    └── profil/              # Profil & paramètres
├── admin/                   # Interface d'administration (API réelle)
│   ├── connexion/           # Connexion admin (e-mail + mot de passe)
│   ├── utilisateurs/  transactions/  regles/  audit/
api/                         # Backend NestJS
├── src/
│   ├── entities.ts          # Modèle de données (§32)
│   ├── ledger/              # Registre double entrée + transactions (+ tests)
│   ├── auth/                # OTP, JWT, Argon2id, gardes de rôles
│   ├── wallet/              # Soldes et transferts utilisateur
│   ├── admin/               # Endpoints d'administration (§25, §34)
│   ├── audit/               # Journal d'audit
│   └── seed.ts              # Données de démonstration fictives
components/                  # Design system (Button, Card, Badge, QR…)
lib/
├── config.ts                # Valeur de référence, limites, feature flags
├── i18n.tsx                 # Dictionnaires FR/EN
├── demo-data.ts             # Données fictives (§53)
└── wallet-store.tsx         # Store démo (le serveur restera la seule source de vérité)
```

## Évolution prévue

Ce dépôt a vocation à devenir le monorepo `boyia-platform` (§49) : `apps/api` (NestJS, registre à double entrée), `apps/admin`, `apps/mobile` (Flutter), packages partagés (`ui`, `types`, `validation`, `localization`). Le store client actuel sera remplacé par l'API — **aucun solde ne sera jamais calculé côté client** (règle 8).

---

⚠️ **Données 100 % fictives.** Cette démo ne collecte, ne stocke et n'envoie aucune donnée personnelle réelle.
