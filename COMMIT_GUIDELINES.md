# Guidelines de Commit et Protection de Branche

## Structure des Commits

Chaque commit doit suivre le format **Conventional Commits** :

```
<type>(<scope>): <subject>
```

### Types autorisés

- **feat** : nouvelle fonctionnalité
- **fix** : correction de bug
- **docs** : documentation
- **style** : changements de formatage (espace, ponctuation, etc.)
- **refactor** : refactorisation de code sans changement de fonctionnalité
- **test** : ajout ou modification de tests
- **chore** : tâches de maintenance (dépendances, scripts, etc.)
- **perf** : amélioration de performance
- **ci** : changements liés à l'intégration continue
- **build** : changements affectant le système de build
- **revert** : annulation d'un commit précédent

### Scope (optionnel)

Le scope indique le module ou la partie de l'application concernée (ex: `auth`, `ui`, `api`, `database`). Il doit être en minuscules et peut contenir des tirets.

### Subject

- Doit être concis et descriptif
- Doit commencer par une minuscule
- Ne pas dépasser **72 caractères**
- Ne pas terminer par un point

### Exemples

```
feat(auth): ajout de l'authentification OAuth2
fix(ui): correction du chevauchement des modales
docs: mise à jour du README
```

## Validation automatique

Un hook Git (`commit-msg`) est configuré pour rejeter les messages qui ne respectent pas cette convention.

## Protection de la branche `dev`

La branche `dev` est protégée avec les règles suivantes (à configurer sur GitHub) :

1. **Pull Request requise** : les commits directs sont interdits ; toute modification doit passer par une Pull Request.
2. **Reviews obligatoires** : au moins une approbation d'un autre développeur.
3. **Status checks obligatoires** :
   - `npm run lint` (linting ESLint)
   - `npm run typecheck` (vérification TypeScript)
   - `npm run build` (build de production)
   - `npm test` (tests unitaires)
4. **Mise à jour obligatoire** : la branche doit être à jour avec `dev` avant fusion.
5. **Conversation résolue** : toutes les discussions sur la PR doivent être résolues.

## Workflow recommandé

1. Créer une branche à partir de `dev` :

   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feat/nouvelle-fonctionnalite
   ```

2. Développer et commiter régulièrement en respectant la convention.

3. Pousser la branche et ouvrir une Pull Request vers `dev`.

4. Attendre les reviews et les status checks.

5. Fusionner après approbation.

## Hooks locaux

Le projet utilise **Husky** et **lint-staged** pour exécuter automatiquement :

- **Pre-commit** : linting et formatage des fichiers modifiés.
- **Commit-msg** : validation du format du message.

Assurez-vous d'installer les dépendances avec `npm install` pour activer les hooks.

## Configuration des protections sur GitHub

Pour configurer les protections sur GitHub, aller dans **Settings > Branches > Branch protection rules** et ajouter une règle pour `dev` avec les options décrites ci-dessus.

Si vous utilisez GitHub CLI, vous pouvez exécuter :

```bash
gh api repos/:owner/:repo/branches/dev/protection \
  --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["lint", "typecheck", "build", "test"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": 1
  },
  "restrictions": null
}
EOF
```

## Résolution des problèmes

Si un commit est rejeté par le hook, corrigez le message avec :

```bash
git commit --amend
```

Ou utilisez `git reset HEAD~` pour annuler le dernier commit et recommencer.

Pour désactiver temporairement les hooks (déconseillé), utilisez `git commit --no-verify`.
