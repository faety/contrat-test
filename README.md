# Boyia App — Application Web

> **Boyia — Apprends, entreprends et sois récompensé.**

Application web responsive de la plateforme **Boyia App**, super-application communautaire, éducative et commerciale fondée sur la **Boyia Currency**, une unité numérique interne en circuit fermé (comparable à des points de fidélité évolués — ni banque, ni cryptomonnaie, ni monnaie ayant cours légal).

Cette première version est une **démonstration front-end** : tous les parcours utilisent des données fictives (cahier des charges §53) et aucun appel serveur réel n'est effectué. Elle matérialise le design system, les parcours et les règles produit avant le branchement sur l'API (NestJS + PostgreSQL, registre comptable à double entrée).

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
npm install
npm run dev        # http://localhost:3000
```

```bash
npm run typecheck  # vérification TypeScript stricte
npm run build      # build de production
```

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
