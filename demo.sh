#!/usr/bin/env bash
# Boyia — démarrage local complet : API (port 4000) + Web (port 3000).
# Usage : ./demo.sh   (Ctrl+C pour tout arrêter)
set -e
cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js 20+ est requis : https://nodejs.org"
  exit 1
fi

echo "▶ Installation des dépendances (première fois uniquement)…"
[ -d api/node_modules ] || (cd api && npm install --no-audit --no-fund)
[ -d node_modules ] || npm install --no-audit --no-fund

echo "▶ Démarrage de l'API sur http://localhost:4000 …"
(cd api && npm run dev) &
API_PID=$!
trap 'kill $API_PID 2>/dev/null || true' EXIT

# Attendre que l'API réponde (base SQLite créée et peuplée au premier lancement).
for i in $(seq 1 60); do
  if command -v curl >/dev/null 2>&1; then
    curl -sf -o /dev/null http://localhost:4000/docs && break
  else
    node -e "fetch('http://localhost:4000/docs').then(()=>process.exit(0),()=>process.exit(1))" && break
  fi
  sleep 1
done

echo ""
echo "════════════════════════════════════════════════════════════"
echo "  ✅ Boyia est prêt !"
echo ""
echo "  Application      : http://localhost:3000"
echo "  Administration   : http://localhost:3000/admin"
echo "  API (OpenAPI)    : http://localhost:4000/docs"
echo ""
echo "  Utilisatrice démo : +2250700000042  /  PIN 1234  (Awa)"
echo "  Admin démo        : admin@boyia.ci  /  Boyia!Admin2026"
echo "  OTP d'inscription : 123456"
echo ""
echo "  Plan de tests détaillé : TESTS.md"
echo "════════════════════════════════════════════════════════════"
echo ""

npm run dev
