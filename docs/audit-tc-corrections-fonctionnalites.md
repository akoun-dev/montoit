# Audit TC — Correctifs & Fonctionnalités Manquantes

> Généré le 26 mai 2026 après analyse complète du code source (composants, API routes, hooks, types)

---

## 🔴 Bloquants / Bugs

### 1. `typeFilter` non rafraîchi au changement de tab dans `overview.tsx`

**Fichier :** `src/components/dashboard/tc/overview.tsx`

**Problème :** Les badges `Notifications` et `Validations agences` ont des `id` en doublon (`dossier-validations`), ce qui casse la navigation par clic. Le `typeFilter` n'est pas réinitialisé quand on clique sur un badge depuis l'overview.

**Fix :** Rendre les `id` uniques et resetter les filtres lors de la navigation depuis l'overview.

---

### 2. Routes API sans validation de schéma

**Fichiers :** Toutes les routes sous `src/app/api/tc/`

**Problème :** Aucune validation Zod/Joi. Les corps de requête sont lus en `req.json()` sans typage ni validation. Une donnée invalide peut entraîner des erreurs 500 silencieuses.

**Fix :** Ajouter une validation systématique avec Zod pour chaque endpoint.

---

### 3. `.range()` manquant sur les requêtes paginées

**Fichiers :** `src/app/api/tc/rental-files/route.ts`, `src/app/api/tc/missions/route.ts`

**Problème :** Les paramètres `page` et `limit` sont acceptés mais les requêtes n'ont pas de `.range()` — elles renvoient **tous** les résultats (risque de saturation mémoire).

**Fix :** Ajouter `.range((page - 1) * limit, page * limit - 1)` sur chaque requête paginée.

---

### 4. Gestion des erreurs 401 dans la sidebar TC (`overview.tsx`)

**Fichier :** `src/components/dashboard/tc/overview.tsx`

**Problème :** En cas d'expiration de session, le catch affiche `error` dans le rendu mais la sidebar reste vide sans redirection vers la connexion. L'utilisateur est bloqué.

**Fix :** Rediriger vers `/auth` en cas de 401 ou afficher un message clair.

---

### 5. Mode hors-ligne (Offline)

**Fichier :** `public/offline.html`

**Problème :** La page offline existe mais le service worker n'est pas implémenté pour les routes API. Les TC ne peuvent pas travailler en mobilité sans connexion.

**Fix :** Service worker avec cache-first pour les données critiques (stats overview) et stratégie network-first avec cache fallback.

---

## 🟠 Améliorations UX importantes

### 6. Pas de confirmation avant "Prendre en charge" un litige

**Fichier :** `src/components/dashboard/tc/litiges.tsx`

**Problème :** Le bouton "Prendre en charge" agit immédiatement sans confirmation. Si un autre TC prenait déjà le dossier, l'API renvoie une erreur "déjà pris en charge" mais l'utilisateur ne la voit pas clairement.

**Fix :** Ajouter une double-confirmation ou un état intermédiaire "Voulez-vous vraiment prendre ce litige en charge ?".

---

### 7. Pas de pagination/scroll infini dans les listes

**Fichiers :** `litiges.tsx`, `missions.tsx`, `fraud-alerts.tsx`, `certifications.tsx`

**Problème :** Toutes ces vues utilisent `filteredList.map()` sans pagination. Dès qu'il y aura > 50-100 entrées, le DOM sera surchargé et l'interface ralentira.

**Fix :** Implémenter un composant de pagination réutilisable (`<PaginatedList>`) avec chargement par lots.

---

### 8. États "vides" incohérents

**Fichiers :** Tous les composants TC

**Problème :** Certains composants ont des états vides stylisés (litiges, fraud-alerts) avec icônes et messages, d'autres non (`missions.tsx` vue calendrier quand aucun jour sélectionné). Incohérence.

**Fix :** Créer un composant `<EmptyState icon={...} title="..." description="..." action={...} />` réutilisable.

---

### 9. La barre d'actions sticky dans `property-verify-detail.tsx` est en bas

**Fichier :** `src/components/dashboard/tc/property-verify-detail.tsx`

**Problème :** La barre d'actions est sticky en bas de page. Utile mais peut gêner sur mobile si le clavier virtuel est ouvert.

**Fix :** Détecter le clavier virtuel (`visualViewport`) et cacher temporairement la barre.

---

### 10. Pas de feedback de chargement pour les mutations simples

**Fichiers :** `litiges.tsx` (changement de priorité), `missions.tsx` (changement de priorité)

**Problème :** Les `handlePriorityChange` n'ont pas d'état `loading` dédié. L'utilisateur peut cliquer plusieurs fois.

**Fix :** Désactiver les boutons de priorité pendant l'appel API.

---

### 11. `evidenceUrls` et `photoUrls` stockées en JSON string

**Fichiers :** `litiges.tsx`, `missions.tsx`

**Problème :** Les URLs sont stockées dans une colonne texte en JSON.stringify et parsées à chaque rendu. Pas idéal. Les champs JSONB de Supabase ne sont pas utilisés.

**Fix :** Migrer vers un type `jsonb` dans la base et utiliser directement les objets JS.

---

### 12. Pas de prévisualisation des images dans les preuves

**Fichier :** `src/components/dashboard/tc/litiges.tsx`

**Problème :** Les preuves (evidenceUrls) sont affichées comme des liens texte cliquables qui ouvrent un WebView. Pas de thumbnail ni de galerie.

**Fix :** Utiliser un composant de galerie similaire à celui de `missions.tsx` (qui a déjà les thumbnails avec `onError`).

---

## 🟡 Fonctionnalités manquantes

### 13. Historique d'activité complet pour chaque litige

**Fichier :** `src/app/api/tc/litiges/route.ts`

**Manque :** La timeline dans le détail du litige montre juste les dates de création/escalade/résolution. Il manque :
- L'historique des changements de statut (OPEN → IN_REVIEW → RESOLVED)
- L'historique des changements de priorité
- L'historique des commentaires TC
- Qui a fait quoi (audit trail)

---

### 14. Notifications temps réel pour les missions assignées

**Fichiers :** `src/components/dashboard/tc/missions.tsx`, hooks `use-realtime-missions`

**Manque :** Les missions sont mises à jour via `useRealtimeMissions` mais il n'y a pas de **notification toast** quand une nouvelle mission est assignée. Le TC doit recharger manuellement.

**Fix :** Afficher un toast "Nouvelle mission : Vérifier {bien}" lors de la réception d'un changement.

---

### 15. Export CSV/PDF des données

**Manque sur tous les composants :**
- Export CSV des biens en attente
- Export PDF d'un état des lieux
- Export CSV des litiges
- Export CSV des certifications

---

### 16. Statut "ON_HOLD" manquant pour les missions

**Fichier :** `src/app/api/tc/missions/route.ts`

**Problème :** Les missions peuvent être `ASSIGNED | IN_PROGRESS | COMPLETED | CANCELLED`. Il manque `ON_HOLD` (mise en pause). Le `rental-files-queue.tsx` a cette fonctionnalité mais pas les missions.

---

### 17. Aucune recherche/commune filter dans `all-properties.tsx`

**Fichier :** `src/components/dashboard/tc/all-properties.tsx`

**Manque :** Le filtre par commune existe dans `property-verifications.tsx` mais pas dans `all-properties.tsx`. Impossibilité de filtrer géographiquement.

---

### 18. Assignation multiple de missions en batch

**Fichier :** `src/components/dashboard/tc/missions.tsx`

**Manque :** Impossible de sélectionner plusieurs missions et de les assigner à un même agent en une action.

---

### 19. Filtre par période (date range) dans les logs d'activité

**Fichiers :** `litiges.tsx`, `missions.tsx`, `fraud-alerts.tsx`

**Manque :** Aucun filtre par plage de dates alors que c'est essentiel pour le reporting.

---

### 20. Dashboard overview : graphiques d'activité

**Fichier :** `src/components/dashboard/tc/overview.tsx`

**Manque :** Actuellement l'overview montre uniquement des badges cliquables. Il manque :
- Graphique d'évolution des validations (7 derniers jours)
- Répartition par type (biens vs dossiers vs litiges)
- Widget SLA (actuellement caché dans dossier-validations)

---

### 21. Signature électronique intégrée

**Manque général :** Il y a une page "Signatures" (`signatures.tsx`) et une route `/api/tc/signatures` mais :
- Pas d'intégration dans le workflow de validation des états des lieux
- Pas de signature dans les litiges (pour les résolutions)
- Pas de signature pour les certifications

---

### 22. Mode sombre incomplet

**Manque :** Plusieurs composants utilisent des couleurs en dur (`bg-brand-500`, `text-red-600`, etc.) qui fonctionnent en mode clair mais peuvent ne pas être optimaux en mode sombre. Vérifier la compatibilité dark mode sur tous les composants TC.

---

### 23. Aucune métadonnée SEO pour le dashboard TC

**Manque :** Les pages du dashboard n'ont pas de `<title>` ou `<meta>` dynamiques. Pour le SEO et l'accessibilité, chaque section devrait avoir un titre de page.

---

### 24. Gestion des doublons dans les signalements

**Fichier :** `src/app/api/tc/signal-property/route.ts`

**Manque :** Un TC peut signaler plusieurs fois le même bien pour la même raison sans vérification de doublon → spam de notifications au propriétaire.

---

### 25. Pas de "Voir plus" dans le feed récent de l'overview

**Fichier :** `src/components/dashboard/tc/dossier-validations.tsx`

**Manque :** Le feed récent est limité à 3 éléments avec "+X autres dossiers en attente" mais ce n'est pas cliquable. Impossible d'accéder à la liste complète depuis le feed.

---

## 📐 Problèmes techniques / dette

| # | Problème | Fichiers concernés |
|---|----------|-------------------|
| 26 | Types dupliqués (mêmes interfaces redéfinies dans chaque composant) | Tous les fichiers `.tsx` |
| 27 | `cn()` utilisé abusivement (styles inline dans 90% des composants au lieu d'extraire des composants réutilisables) | `litiges.tsx`, `missions.tsx` |
| 28 | Absence de tests unitaires pour les routes API (aucun test trouvé) | `src/app/api/tc/*` |
| 29 | Pas de `loading.tsx` ou `error.tsx` pour les segments TC dans Next.js | `src/app/dashboard/tc/` |
| 30 | Icônes importées individuellement au lieu d'importer `lucide-react` globalement | Tous les composants (poids du bundle) |
| 31 | Pas de cache API pour les appels récurrents (stats overview, etc.) | Routes `dashboard/tc`, `tc/rental-files` |
| 32 | Console.error dans les catch handlers au lieu d'un logger structuré | Tous les fichiers `
| 33 | Les imports `'@/components/ui/...'` ne sont pas tree-shakables car importés individuellement | Tous les fichiers |

---

## 🧩 Suggestions mineures

34. **Badge "SLA dépassé"** rouge en permanence → ajouter un tooltip avec la date exacte du dépassement.
35. **Missions** : les dates de planning sont en `date` uniquement, pas de sélection d'horaire.
36. **Litiges** : le sélecteur de priorité dans le dialog détail n'affiche pas l'icône de priorité (Flame/AlertTriangle/CircleDot).
37. **Fraud alerts** : pas de possibilité de joindre des preuves (contrairement aux litiges).
38. **Certifications** : pas de date d'expiration pour les certifications.
39. **Messages TC** : pas de pièces jointes dans les messages entre TC et utilisateurs.
40. **Propriétaire contact** dans `property-verify-detail.tsx` : pas de lien direct pour appeler depuis l'interface (le numéro est juste affiché).

---

## 📊 Priorisation suggérée

### Priorité haute (cette semaine)
- ✅ #3 Pagination manquante (bugs potentiels de performance)
- ✅ #1 Navigation cassée dans overview (doublons d'id)
- ✅ #5 Service worker offline
- ✅ #2 Validation de schéma des requêtes API
- ✅ #13 Historique d'activité complet

### Priorité moyenne (cette itération)
- ✅ #6 Confirmation avant prise en charge litige
- ✅ #7 Pagination/scroll infini dans les listes
- ✅ #14 Notifications temps réel missions
- ✅ #8 Composant EmptyState unifié
- ✅ #10 Loading states manquants

### Priorité basse (backlog)
- ✅ #15 Export CSV/PDF
- ✅ #17 Filtre commune dans all-properties
- ✅ #20 Graphiques dashboard overview
- ✅ #34 Tooltip SLA
- ✅ #35 Sélecteur d'horaire missions

---

*Document généré par analyse du code source du module TC — 26 mai 2026*
