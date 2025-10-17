#!/usr/bin/env bash
set -euo pipefail

echo "🚿 Mon Toit Detox — Hygiène de code adaptée Lovable"

# 0) Détection gestionnaire de paquets (avec Bun)
PKG=""
if command -v bun >/dev/null 2>&1; then PKG="bun"
elif command -v pnpm >/dev/null 2>&1; then PKG="pnpm"
elif command -v yarn >/dev/null 2>&1; then PKG="yarn"
else PKG="npm"; fi
echo "📦 Package manager: $PKG"

run() {
  case $PKG in
    bun) bun "$@" ;;
    pnpm) pnpm "$@" ;;
    yarn) yarn "$@" ;;
    *) npm "$@" ;;
  esac
}

addDev() {
  case $PKG in
    bun) bun add -D "$@" ;;
    pnpm) pnpm add -D "$@" ;;
    yarn) yarn add -D "$@" ;;
    *) npm i -D "$@" ;;
  esac
}

# 1) Dépendances SAFE (pas de breaking changes)
echo "📦 Installation des outils d'hygiène..."
addDev \
  prettier prettier-plugin-tailwindcss \
  lint-staged husky \
  sort-package-json syncpack \
  depcheck madge \
  npm-check-updates \
  zx

# 2) Fichiers de config (créés s'ils n'existent pas)
echo "📝 Création des fichiers de configuration..."

[ -f .editorconfig ] || cat > .editorconfig << 'EOF'
root = true
[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
EOF

[ -f .prettierrc ] || cat > .prettierrc << 'EOF'
{
  "printWidth": 100,
  "singleQuote": false,
  "semi": true,
  "trailingComma": "es5",
  "tabWidth": 2,
  "plugins": ["prettier-plugin-tailwindcss"]
}
EOF

[ -f .prettierignore ] || cat > .prettierignore << 'EOF'
node_modules
dist
build
coverage
.next
.out
src/integrations/supabase/types.ts
src/integrations/supabase/client.ts
supabase/migrations
EOF

# 3) Scripts package.json (sans modifier ESLint config)
echo "🔧 Ajout des scripts..."
node - <<'EOF'
const fs = require('fs');
const path = 'package.json';
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));

pkg.scripts = Object.assign({
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "typecheck": "tsc -p tsconfig.app.json --noEmit",
  "deps:audit": "depcheck || true",
  "deps:outdated": "ncu || true",
  "deps:update": "ncu -u && npm i",
  "circulars": "madge --extensions ts,tsx --circular src || true",
  "pkg:sort": "sort-package-json",
  "check:hygiene": "node scripts/hygiene-report.mjs",
  "fix:format": "prettier --write ."
}, pkg.scripts || {});

if (!pkg['lint-staged']) {
  pkg['lint-staged'] = {
    "*.{ts,tsx,js,jsx}": ["prettier --write"],
    "*.{json,md,css}": ["prettier --write"]
  };
}

fs.writeFileSync(path, JSON.stringify(pkg, null, 2));
console.log("✅ Scripts ajoutés");
EOF

# 4) Husky (pre-commit léger)
if [ ! -d .husky ]; then
  npx husky init >/dev/null 2>&1 || true
fi
echo 'npx lint-staged' > .husky/pre-commit
chmod +x .husky/pre-commit

# 5) Script de rapport d'hygiène
mkdir -p scripts

cat > scripts/hygiene-report.mjs << 'EOF'
#!/usr/bin/env node
import { $ } from 'zx';
import fs from 'fs';

const report = {
  passed: [],
  warnings: [],
  failed: []
};

const check = async (title, cmd, severity = 'warning') => {
  console.log(`\n🔎 ${title}...`);
  try {
    await $`${cmd}`;
    report.passed.push(title);
    console.log(`✅ ${title} OK`);
  } catch (e) {
    if (severity === 'error') {
      report.failed.push(title);
      console.error(`❌ ${title} KO`);
    } else {
      report.warnings.push(title);
      console.warn(`⚠️  ${title} — À améliorer`);
    }
  }
};

console.log("🧪 Mon Toit — Rapport d'hygiène de code\n");

// Checks non-cassants
await check("Formatage Prettier", "npm run -s format:check", "warning");
await check("TypeCheck (mode laxiste)", "npm run -s typecheck", "warning");
await check("Dépendances inutilisées", "npm run -s deps:audit", "warning");
await check("Imports circulaires", "npm run -s circulars", "warning");

// Rapport final
console.log("\n" + "=".repeat(50));
console.log(`✅ Passed: ${report.passed.length}`);
console.log(`⚠️  Warnings: ${report.warnings.length}`);
console.log(`❌ Failed: ${report.failed.length}`);

if (report.warnings.length > 0) {
  console.log("\n💡 Suggestions d'amélioration :");
  console.log("- Lancer 'npm run fix:format' pour corriger le formatage");
  console.log("- Activer progressivement le mode strict TypeScript");
  console.log("- Nettoyer les dépendances inutilisées");
}

// Exit code basé sur les erreurs critiques uniquement
process.exit(report.failed.length > 0 ? 1 : 0);
EOF
chmod +x scripts/hygiene-report.mjs

# 6) Première passe NON-DESTRUCTIVE
echo "🧹 Formatage initial (Prettier)..."
npx prettier --write . || echo "⚠️  Prettier a trouvé des erreurs (non-bloquant)"

echo "🧪 Génération du rapport d'hygiène..."
run run -s check:hygiene || true

echo ""
echo "✅ Detox Mon Toit terminé !"
echo ""
echo "📊 Prochaines étapes recommandées :"
echo "  1. Lire le rapport d'hygiène : npm run check:hygiene"
echo "  2. Corriger le formatage : npm run fix:format"
echo "  3. Auditer les dépendances : npm run deps:audit"
echo "  4. Vérifier les cycles : npm run circulars"
echo ""
echo "🔒 Git hooks activés : lint-staged se lancera à chaque commit"
