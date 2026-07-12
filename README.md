# Kalan — cours en ligne & communauté (mobile first)

> **Kalan** signifie « apprendre » en bambara.

Webapp mobile first de cours en ligne, **testable immédiatement** : un seul fichier `index.html`, sans installation, sans base de données, sans compte tiers.

## Tester tout de suite

```bash
# Option 1 : ouvrir directement le fichier
# double-clique sur index.html (ou glisse-le dans un navigateur)

# Option 2 : petit serveur local
python3 -m http.server 8080
# puis ouvre http://localhost:8080 (idéalement en mode mobile des DevTools)
```

Aucune donnée ne quitte le navigateur : tout est stocké en `localStorage` (bouton « Réinitialiser la démo » dans Profil).

## Ce que fait l'application

- **Catalogue de cours** gratuits et payants (prix en FCFA), recherche et filtres par catégorie, fiches cours complètes (programme, formateur, note, « ce que tu vas apprendre »).
- **Inscription style Tally** : une question par écran (prénom → nom → numéro WhatsApp avec indicatif pays → e-mail), barre de progression, validation champ par champ, touche Entrée pour avancer, récapitulatif avant confirmation. Le compte n'est demandé **qu'au moment de s'inscrire à un cours** (zéro friction pour explorer).
- **Paiement mobile money simulé** : choix de l'opérateur (Wave, Orange Money, MTN MoMo, Moov Money), numéro pré-rempli depuis le WhatsApp, écran d'attente « confirme avec ton code secret », reçu avec référence. *Mode démo : aucun argent réel ; en production, brancher un agrégateur (CinetPay, PayDunya, FedaPay…).*
- **Espace d'apprentissage** : leçons par module, « marquer comme terminée », progression par cours.
- **Communauté** (inspirée de Skool) : fil avec catégories (Général, Entraide, Victoires, Annonces), publications, j'aime, commentaires, classement par points (+10 leçon terminée, +5 publication, +2 commentaire).
- **Profil** : informations, points, thème clair/sombre/auto, réinitialisation de la démo.

## Choix issus de la recherche

- **Tally / Typeform** : le format « une question à la fois » avec progression visible améliore le taux de complétion des formulaires — appliqué à l'inscription.
- **Skool** : cours + communauté + gamification légère au même endroit, interface volontairement minimale — appliqué à la structure à 4 onglets (Cours · Communauté · Mes cours · Profil).
- **Mobile money** : rail de paiement principal en Afrique de l'Ouest ; le parcours reproduit les codes connus des utilisateurs (choix opérateur → numéro → confirmation par code secret → reçu).

## Design

- Palette « papier & kola » : fond `#F7F5F0`, vert kola `#0C7A5B`, accent ambre `#E8A020` ; thème sombre complet dérivé des mêmes tokens.
- Typographie : serif système (Iowan/Palatino/Georgia) pour la marque et les titres, sans-serif système pour l'interface — aucun chargement de police externe.
- Zones tactiles ≥ 44 px, `aria-label` sur les contrôles, respect de `prefers-reduced-motion`, chiffres tabulaires pour les montants.

## Vers la production

Ce prototype valide le parcours. Pour la mise en production, il faudra :

1. un backend (comptes, cours, paiements) — par ex. Next.js + Postgres ou Supabase ;
2. un agrégateur mobile money (CinetPay, PayDunya, FedaPay, Paystack) avec webhooks de confirmation ;
3. l'hébergement des vidéos (Mux, Cloudflare Stream, YouTube non répertorié) ;
4. les notifications WhatsApp (API WhatsApp Business) pour les accès et rappels.

---

⚠️ **Démo 100 % fictive** : personnes, cours, paiements et messages sont des données de démonstration ; rien n'est collecté ni envoyé.
