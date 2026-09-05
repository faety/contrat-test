# Skill « wave-payments » — paiements Wave pour tes webapps

Skill Claude Code réutilisable : tout le savoir-faire d'intégration Wave
éprouvé sur boyiainstitute.com (prix serveur, webhook signé, réconciliation,
idempotence, abonnements sans prélèvement automatique, banc de test).

## Comment l'utiliser dans un NOUVEAU projet

Option A — pour un seul projet :

    cp -r .claude/skills/wave-payments  <nouveau-projet>/.claude/skills/

Option B — pour TOUS tes projets (recommandé) :

    cp -r .claude/skills/wave-payments  ~/.claude/skills/

Ensuite, dans n'importe quelle session Claude Code de ce projet, dis
simplement : « intègre les paiements Wave » (ou `/wave-payments`).
Claude chargera le skill et suivra l'architecture éprouvée au lieu de
réinventer (et de retomber dans les pièges déjà payés ici).

## Contenu

- `SKILL.md` — l'architecture et les règles (lu par Claude en premier).
- `references/wave.js` — module Wave prêt à copier (signature, sessions,
  réconciliation, catalogue, `payable()`).
- `references/endpoints.md` — gabarits des 4 endpoints + `afterPaid`
  idempotent.
- `references/test-wave-stub.js` — faux serveur Wave pour tester le parcours
  réel sans toucher au vrai Wave.
- `references/checklist.md` — liste de contrôle de mise en production.
