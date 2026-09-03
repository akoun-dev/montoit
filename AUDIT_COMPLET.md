# Audit complet du projet Mon Toit CI

**Date de l'audit :** 3 septembre 2026  
**Périmètre :** dépôt applicatif complet, hors `node_modules/` et `.next/` généré  
**Méthode :** revue statique du code, de l'architecture, des migrations Supabase, des configurations, des tests, des scripts et de la documentation, complétée par `npm run lint`, `npm run test:run`, `npx tsc --noEmit`, l'inventaire Git et une tentative de `npm audit`.

## 1. Synthèse exécutive

Mon Toit CI est une plateforme immobilière riche couvrant les visiteurs, locataires, propriétaires, agences, tiers de confiance et administrateurs. L'architecture est cohérente dans ses grandes lignes : Next.js App Router, API Routes, Supabase Auth/Postgres/Realtime/Storage, Edge Functions et Capacitor.

Le produit présente cependant un niveau de risque élevé avant mise en production ou extension à grande échelle. Les principaux facteurs sont :

- des documents et pièces jointes stockés dans des buckets publics ;
- l'utilisation généralisée de `service_role`, qui contourne les RLS et reporte toute la sécurité sur le code applicatif ;
- deux mécanismes d'authentification coexistants, dont un cookie de session personnalisé non traité par le middleware ;
- une autorisation dupliquée et incohérente entre `role`, `active_role`, middleware, routes et Edge Functions ;
- une chaîne de tests actuellement non exécutable ;
- 157 erreurs ESLint et des erreurs TypeScript reproductibles ;
- une surface applicative volumineuse, très centralisée côté client, avec de nombreux hooks Realtime et des requêtes larges ;
- une gestion des dépendances et des runtimes non standardisée.

**Avis global :** la base fonctionnelle est avancée, mais la fiabilité, la confidentialité des données et la gouvernance des accès doivent être renforcées avant de considérer le système comme industrialisé.

**Niveaux :** P0 = bloquant/risque critique immédiat ; P1 = élevé ; P2 = moyen ; P3 = amélioration à planifier.

## 2. Périmètre et inventaire

| Élément | Constat |
|---|---|
| Frontend | Next.js 16, React 19, TypeScript, Tailwind/shadcn, Zustand, TanStack Query |
| Backend | 148 routes API suivies par Git, accès Supabase direct depuis les handlers |
| Données | PostgreSQL Supabase, 64 migrations SQL, RLS, Storage |
| Asynchrone | 20 Edge Functions Supabase, notifications et intégrations externes |
| Temps réel | Hooks Realtime pour messages, baux, candidatures, missions, validations, paiements, etc. |
| Mobile | Capacitor iOS/Android |
| Intégrations | Intouch/mobile money, CRYPTONEO, RNPP/ONECI, NeoFace, SMS/email ANSUT |
| Tests | 12 fichiers sous `src/test` détectés par Vitest et 2 suites Playwright ; configuration cassée |
| État Git | 4 modifications locales préexistantes conservées ; aucun fichier existant n'a été réverti |

## 3. Architecture et code

### A-001 — Architecture client trop centralisée — **P2**

**Constat :** le dashboard importe les composants de tous les rôles et distribue les vues par de grands `switch` dans `src/components/dashboard/index.tsx`. La navigation est portée par l'état Zustand et l'historique navigateur plutôt que par des segments App Router.

**Risques :** bundle initial important, faible isolation des rôles, deep linking et chargement/erreurs par page difficiles, forte zone de conflit en maintenance.

**Recommandation :** migrer progressivement vers des groupes de routes (`app/(dashboard)/locataire`, `proprietaire`, `agence`, `tc`, `admin`) avec layouts et wrappers d'autorisation communs.

### A-002 — Logique métier mélangée aux routes — **P2**

**Constat :** plusieurs handlers effectuent simultanément validation, autorisation, requêtes, mapping, notifications et transitions métier. `src/app/api/properties/route.ts` est représentatif ; `src/app/api/seed/route.ts` dépasse 1 200 lignes.

**Risques :** duplication, régressions lors des changements de workflow, tests difficiles, règles différentes selon le point d'entrée.

**Recommandation :** introduire des services par domaine (`properties`, `rental-files`, `leases`, `payments`, `trust-validation`) et laisser les routes jouer le rôle d'adaptateurs HTTP.

### A-003 — Autorisation fragmentée — **P1**

**Constat :** les contrôles sont répartis entre `middleware.ts`, `resolveRequestUser`, des fonctions `authorizeTC`, des contrôles de rôle locaux et des filtres manuels. Le middleware ne mappe pas les rôles pour `applications`, `visits`, `payments`, `leases`, `mandats`, `notifications`, `messages`, `maintenance`, `disputes`, `reviews`, `users`, `profile` et plusieurs routes `properties`.

**Risques :** dérive des politiques, nouvelle route oubliée, accès accordé par le middleware puis refusé par la route, ou inversement.

**Recommandation :** fournir `requireUser`, `requireEffectiveRole`, `requireAnyRole`, `requireOwnership` et `requireParticipant`, puis les rendre obligatoires dans les handlers. Utiliser le middleware seulement pour une protection grossière et la mise à jour des cookies.

### A-004 — Documentation en décalage avec le code — **P2**

**Constat :** le README documente une migration Prisma terminée, 26 hooks Realtime et un inventaire d'Edge Functions ; le dépôt contient plutôt une migration Supabase active, des correctifs incrémentaux et des noms de fonctions/route parfois différents. `worklog.md` sert de journal historique mais est utilisé comme référence technique.

**Risques :** déploiements incomplets, intégrateurs orientés vers de faux endpoints, difficulté d'exploitation.

**Recommandation :** maintenir un inventaire canonique généré depuis le tree source, documenter les contrats API et vérifier en CI la cohérence routes/functions/documentation.

## 4. Profils et intégration métier

| Profil | Intégration UI | Intégration API/données | Évaluation |
|---|---|---|---|
| Visiteur | Accueil, recherche et consultation de biens | `GET /api/properties`, avis/statistiques publics | Fonctionnel, mais confidentialité des contacts à corriger |
| Locataire | Recherche, favoris, candidatures, visites, baux, paiements, maintenance, messages | `/api/locataire`, applications, visits, leases, payments, rental-files | Couverture large ; contrôles de propriété à tester systématiquement |
| Propriétaire | Biens, locataires, baux, mandats, finances, maintenance, avis | `/api/owner`, properties, leases, mandats | Couverture large ; chevauchement avec agence et `active_role` incohérent |
| Agence | Portefeuille, équipe, mandats, contrats, finances, marketing | `/api/agence` et opérations de propriétaire | Agents présents en schéma mais capacités insuffisamment modélisées dans l'autorisation |
| Tiers de confiance | Vérifications, dossiers, missions, SLA, fraude, ONECI, certifications, litiges | `/api/tc`, fonctions KYC et dashboard TC | Domaine riche ; privilèges élevés à cloisonner davantage |
| Admin | Utilisateurs, modération, système, backups, audit, litiges | `/api/admin`, dashboard admin, service role | Très puissant ; exige des contrôles serveur et une traçabilité renforcés |

### P-001 — Rôles `role` et `active_role` incohérents — **P1**

**Constat :** le changement de rôle met à jour `active_role`, mais certaines routes contrôlent encore `users.role`. Des cas sont visibles dans `properties/route.ts` et `notifications/route.ts`, alors que d'autres utilisent `active_role || role`.

**Risques :** un utilisateur multi-rôle peut être refusé ou autorisé différemment selon l'endpoint ; risque de privilège induit par une mauvaise interprétation du rôle actif.

**Recommandation :** définir une seule fonction serveur `getEffectiveRole()` et une politique explicite : rôle permanent, rôle actif et appartenance agence ne doivent pas être interchangeables.

### P-002 — Agence et agents partiellement intégrés — **P2**

**Constat :** les tables `agency_agents` et `agency_agent_properties` prévoient des agents, mais le modèle client et plusieurs APIs raisonnent surtout sur le compte agence. Les capacités `AGENT`, `READ_ONLY` ou équivalentes ne sont pas uniformément appliquées.

**Risques :** sur-autorisation d'un agent ou impossibilité pour un agent légitime d'accéder à son périmètre.

**Recommandation :** résoudre à chaque opération l'agence, le membre, le statut, le niveau de capacité et le périmètre de biens/clients ; ajouter des tests dédiés par capacité.

## 5. Sécurité et confidentialité

### S-001 — Buckets de documents publics — **P0**

**Constat :** `20260522000002_create_message_attachments.sql` crée un bucket public et une policy de lecture « Anyone ». `20260522000001_make_lease_documents_bucket_public.sql` rend les documents de baux publics. Le bucket des mandats est également public dans `20260522000006_create_mandat_documents_bucket.sql`. Les buckets `property-documents`, `owner-documents` et `rental-documents` sont déclarés publics dans `20260518131942_create_storage_buckets.sql`.

**Risques :** contrats, pièces justificatives, pièces jointes de conversation et documents d'identité téléchargeables par toute personne disposant d'une URL ; absence de contrôle d'accès, révocation et audit faibles.

**Recommandation :** rendre les buckets privés, générer côté serveur des signed URLs de courte durée après vérification du participant/owner/agency/TC/admin, et supprimer les dépendances externes aux URLs publiques.

### S-002 — RLS contournées par `service_role` — **P0**

**Constat :** `src/lib/supabase/admin.ts` utilise `SUPABASE_SERVICE_ROLE_KEY`. Les routes l'emploient largement, alors que cette clé contourne les politiques RLS. La migration `20260618000000_applications_rls_policies.sql` reconnaît explicitement ce modèle.

**Risques :** une erreur dans un filtre d'ownership devient une fuite ou une mutation inter-utilisateurs ; la base ne fournit plus de filet de sécurité pour la majorité des opérations HTTP.

**Recommandation :** privilégier les clients liés à l'utilisateur et rendre RLS autoritaire pour les opérations utilisateur. Si `service_role` est conservé, imposer une couche de politiques centralisée, des prédicats d'appartenance obligatoires et des tests cross-user/cross-role sur chaque route sensible.

### S-003 — Impersonation interne par clé service role — **P1**

**Constat :** `supabase/functions/_shared/auth.ts` accepte `x-user-id` lorsque le bearer token est la clé `service_role`. Les proxys Next l'envoient pour les sessions personnalisées via `get-edge-function-bearer-token.ts`.

**Risques :** fuite de la clé ou exposition accidentelle d'une Edge Function permettant d'usurper n'importe quel utilisateur. `oneci-subscription` semble de plus vérifier l'authentification sans imposer le rôle admin malgré sa documentation.

**Recommandation :** remplacer ce mécanisme par une assertion interne signée, courte et limitée à une opération, ou résoudre la session côté Edge. Répliquer l'autorisation Admin dans la fonction elle-même.

### S-004 — Deux systèmes de session — **P1**

**Constat :** Supabase Auth est vérifiée dans `middleware.ts`, tandis que `resolveRequestUser` prévoit un cookie de session custom et une table `sessions`. Le middleware ne vérifie pas ce cookie.

**Risques :** utilisateurs connectés par SMS redirigés comme anonymes ; réponses HTML de redirection au lieu de JSON 401 pour API/mobile ; comportement différent selon le chemin d'accès.

**Recommandation :** unifier sur Supabase Auth ou rendre les deux mécanismes cohérents dans un wrapper unique. Une route API non authentifiée doit retourner JSON 401, jamais une redirection navigateur.

### S-005 — Contacts propriétaire dans le catalogue public — **P1**

**Constat :** `GET /api/properties` utilise le client admin et enrichit la réponse avec email/téléphone du propriétaire (`properties/route.ts`, lignes 397-409 et mapping final). Le schéma prévoit pourtant `show_email` et `show_phone`.

**Risques :** divulgation de données personnelles et contournement des préférences de confidentialité.

**Recommandation :** respecter les flags de visibilité et remplacer l'exposition directe par un formulaire de contact interne ou un alias contrôlé.

### S-006 — Recherche et pagination publiques insuffisamment bornées — **P1**

**Constat :** la route propriétés accepte `all=true`, qui désactive la limite, et construit une expression `.or()` avec des valeurs de recherche interpolées.

**Risques :** déni de service par réponse volumineuse, filtres PostgREST malformés et charge inutile sur la base.

**Recommandation :** imposer une limite serveur, supprimer `all=true` côté public, normaliser les filtres avec des helpers sûrs et limiter les recherches coûteuses.

### S-007 — OTP et données sensibles — **P1**

**Constat :** `otp_codes.code` est stocké en clair et une policy autorise l'insertion anonyme avec `with check (true)` dans `20260518131904_create_otp_codes.sql`. Le hash est présent dans `src/lib/otp-hash.ts`, mais son application globale doit être vérifiée.

**Risques :** lecture ou fuite de base donnant accès à des codes actifs ; abus d'insertion anonyme si les routes et limites sont contournées.

**Recommandation :** ne stocker qu'un hash avec expiration, compteur de tentatives et invalidation atomique ; restreindre l'insertion à des fonctions serveur ou policies strictes.

### S-008 — Rate limiting local au processus — **P1**

**Constat :** `src/lib/rate-limiter.ts` conserve les compteurs en mémoire dans une `Map`. Le commentaire reconnaît que la limite est approximative en multi-processus PM2.

**Risques :** contournement en changeant de worker/instance, remise à zéro au redémarrage, protection insuffisante des OTP, KYC et paiements.

**Recommandation :** utiliser un stockage partagé (Redis ou fonction/base Supabase atomique), avec clés IP + compte + opération et métriques de rejet.

### S-009 — Logs potentiellement sensibles — **P1**

**Constat :** de nombreux `console.log/error` affichent IDs utilisateur, noms de cookies, emails/téléphones, URLs de stockage, réponses de fournisseurs et payloads de paiement. `request-user.ts`, `storage.ts`, `intouch.ts`, `ansut-messaging.ts` et les Edge Functions sont concernés.

**Risques :** fuite de données dans logs, traces ou outils d'exploitation ; impossibilité de respecter une politique de minimisation.

**Recommandation :** logger en JSON avec corrélation, niveaux, redaction des secrets/PII et désactivation du debug en production.

### S-010 — Route de seed destructive — **P1**

**Constat :** `POST /api/seed` efface de nombreuses tables et recrée des utilisateurs. La route bloque `NODE_ENV=production` et exige un Admin, ce qui est positif.

**Risques :** exécution accidentelle sur staging ou environnement mal configuré ; perte massive de données.

**Recommandation :** déplacer le seed vers une commande CLI de développement, exiger une allowlist d'environnement et un token explicite, auditer et confirmer les opérations irréversibles.

## 6. Données, stockage et intégrations

### I-001 — Paiement mobile money — **P1**

**Constat :** Intouch est intégré via routes Next et Edge Functions ; les callbacks et transitions de paiement sont distribués entre `payments/callback`, `payment-callback`, `payment-initiate` et `payment-transfer`.

**Risques :** double callback, replay, transition incohérente ou montant modifié si idempotence, signature du webhook et contraintes de transition ne sont pas atomiques.

**Recommandation :** valider une signature/secret indépendant, stocker un identifiant fournisseur unique, rendre les callbacks idempotents, verrouiller les transitions et ajouter des tests de replay/timeout/échec partiel.

### I-002 — KYC/biométrie — **P1**

**Constat :** ONECI/RNPP et NeoFace traitent NNI, images faciales et résultats biométriques. Les routes proxy et fonctions sont nombreuses.

**Risques :** données hautement sensibles, conservation excessive, logs de payloads, autorisation trop large et absence apparente de politique de rétention documentée.

**Recommandation :** minimiser et chiffrer les données, ne jamais logger les images/NNI, restreindre les accès TC/Admin, définir rétention/suppression et vérifier les contrats de sous-traitance et la localisation des données.

### I-003 — Signature électronique — **P1**

**Constat :** CRYPTONEO est appelé depuis plusieurs proxies et Edge Functions, avec génération de certificat, OTP, signature, vérification et récupération de fichier.

**Risques :** exposition de PDF par Storage public, reprise d'une signature, absence de preuve d'intégrité ou confusion entre signataire et utilisateur courant.

**Recommandation :** lier chaque demande à un bail/mandat et un utilisateur, appliquer une durée et un usage unique à l'OTP, vérifier le hash du document, journaliser une preuve immuable et conserver les fichiers en privé.

## 7. Performance et scalabilité

### T-001 — Requêtes `select('*')` et agrégations en mémoire — **P1**

**Constat :** plusieurs routes chargent des colonnes larges ou des collections complètes, notamment dashboards, propriétés, messages et `/api/stats`. Les statistiques agrègent des vues/ratings côté serveur.

**Risques :** latence, mémoire, réponses trop larges, fuite de colonnes, coût croissant avec le volume.

**Recommandation :** projections explicites, DTOs, agrégats SQL/RPC (`COUNT`, `SUM`, `AVG`), limites systématiques et index sur statuts/date/foreign keys.

### T-002 — Uploads parallèles et limites incohérentes — **P1**

**Constat :** les images sont envoyées avec `Promise.all` et le body Server Actions est fixé à `100mb`, alors que les buckets autorisent des tailles variables.

**Risques :** pression mémoire et réseau, upload partiellement réussi, abus de ressources.

**Recommandation :** signed upload URLs, limite de taille totale, MIME vérifié côté serveur, concurrence bornée et nettoyage des objets orphelins.

### T-003 — Surface Realtime très large — **P2**

**Constat :** de nombreux hooks ouvrent des abonnements pour missions, dossiers, fraude, SLA, mandats, messages, baux, paiements, etc.

**Risques :** trop de canaux simultanés, refetchs en cascade, fuites de subscriptions et consommation mobile.

**Recommandation :** auditer création/nettoyage, mutualiser les canaux, ne souscrire qu'à la vue active et suspendre en arrière-plan.

### T-004 — Images et bundle — **P2**

**Constat :** `@next/next/no-img-element` est désactivé et des images brutes coexistent avec `next/image`. Le catalogue de dépendances est large (Leaflet, Recharts, MDX editor, Framer Motion, Capacitor, Radix).

**Risques :** poids initial élevé, chargement mobile lent et absence d'optimisation dimension/lazy-load.

**Recommandation :** analyser le bundle, lazy-loader les modules lourds, utiliser `next/image` avec tailles explicites et revoir les dépendances inutilisées.

## 8. Qualité, tests et maintenabilité

### Q-001 — Suite Vitest non exécutable — **P0**

**Constat vérifié :** `npm run test:run` détecte 12 suites mais échoue avant exécution avec `Cannot find module .../src/test/setup.ts`, pourtant référencé par `vitest.config.ts:8`.

**Risques :** aucune régression métier détectée automatiquement ; couverture non fiable.

**Recommandation :** restaurer ou supprimer la référence vers `src/test/setup.ts`, charger `@testing-library/jest-dom` correctement, puis rendre le test minimal obligatoire en CI.

### Q-002 — Erreurs TypeScript dans les tests — **P0**

**Constat vérifié :** `npx tsc --noEmit` signale les matchers `toBeInTheDocument`/`toHaveAttribute` non reconnus, des mocks incomplets de `UseAppReturn` et une propriété dupliquée dans `core-actions-flow.test.ts`.

**Risques :** tests non compilables et faux sentiment de couverture.

**Recommandation :** corriger les types de setup, les mocks et les doublons ; séparer éventuellement `tsconfig.app.json` et `tsconfig.test.json` sans exclure les tests du contrôle.

### Q-003 — ESLint en échec massif — **P0**

**Constat vérifié :** `npm run lint` échoue avec 157 erreurs et 9 warnings. Une grande partie concerne `react-hooks/set-state-in-effect`, mais cela révèle aussi une utilisation intensive d'effets qui déclenchent des mises à jour synchrones.

**Risques :** régressions de rendu, cascades, stale state et impossibilité de faire respecter une qualité minimale.

**Recommandation :** corriger par lots les effets, remplacer les dérivations par des valeurs calculées lorsque possible, puis réactiver progressivement `exhaustive-deps`, `no-undef`, `no-unreachable`, les règles TypeScript et les contrôles d'imports.

### Q-004 — Configuration de qualité trop permissive — **P1**

**Constat :** `eslint.config.mjs` désactive `no-explicit-any`, `no-unused-vars`, `no-undef`, `no-unreachable`, `react-hooks/exhaustive-deps`, `no-console` et d'autres règles. `tsconfig.json` conserve `strict` mais désactive `noImplicitAny`, autorise JS et exclut les Edge Functions.

**Risques :** défauts masqués, types fragiles, hooks incomplets et code Edge non contrôlé.

**Recommandation :** réactiver les règles de correction par étapes, créer un tsconfig Deno/Edge séparé, réduire `any` et utiliser Zod aux frontières HTTP/externe.

### Q-005 — E2E non déterministes et non exposés par script — **P1**

**Constat :** Playwright existe mais aucun script `test:e2e` n'est déclaré. Les tests utilisent des emails/mots de passe en dur, des `waitForTimeout`, un serveur local et des données Supabase préexistantes. Le seed définit `demo1234`, tandis que les tests utilisent `Test1234!`.

**Risques :** tests flakys ou impossibles à reproduire ; aucune isolation de données ; le test de logout manipule localStorage/cookies plutôt que l'action réelle.

**Recommandation :** fixtures isolées, seed idempotent dédié aux tests, secrets CI, assertions sur états, scripts `test:unit`/`test:e2e`, projets mobile/accessibilité.

### Q-006 — Dépendances et runtime non standardisés — **P1**

**Constat :** le README prescrit pnpm, le lockfile est npm, `start` utilise Bun, les scripts utilisent npm/npx et Capacitor mélange majoritairement v8 avec `@capacitor/inappbrowser` v4. `next-auth` est déclaré sans usage identifié par la revue statique.

**Risques :** installations différentes, conflits peer/runtime et builds mobile divergents.

**Recommandation :** choisir npm/pnpm/Bun, ajouter `packageManager`, aligner la documentation et les scripts, vérifier la compatibilité Capacitor et supprimer les dépendances inutilisées après analyse.

### Q-007 — Déploiement et configuration à durcir — **P1**

**Constat :** `next.config.ts` désactive `reactStrictMode`, fixe un body limit de 100 MB et contient des patterns localhost. `ecosystem.config.js` découvre le serveur via `find`; le Caddyfile expose un port de transformation configurable par query `XTransformPort`.

**Risques :** incohérence web/PM2, exposition de surface réseau, ressources excessives et défauts détectés tardivement.

**Recommandation :** aligner Node/Bun, smoke-tester `.next/standalone`, supprimer la découverte dynamique, limiter le proxy à une allowlist et activer Strict Mode après correction des effets.

### Q-008 — `.gitignore` et artefacts — **P2**

**Constat :** `.gitignore` contient un texte parasite en première ligne, des doublons et n'exclut pas clairement `e2e-report/`, alors qu'un rapport généré existe. Des fichiers `.env` sont présents dans l'arbre mais ne sont pas suivis par Git ; leurs valeurs n'ont pas été inspectées ni publiées.

**Risques :** fuite accidentelle par commit ou artefact CI, bruit de dépôt et confusion.

**Recommandation :** nettoyer `.gitignore`, exclure rapports/vidéos/traces, vérifier l'historique Git et faire tourner les secrets si une valeur réelle a déjà été exposée.

## 9. Vérifications exécutées

| Vérification | Résultat |
|---|---|
| `npm run lint` | Échec : 157 erreurs, 9 warnings |
| `npm run test:run` | Échec : setup Vitest absent, 12 suites sans test exécuté |
| `npx tsc --noEmit` | Échec : erreurs de types de tests, matchers DOM absents, mock incomplet, propriété dupliquée |
| `npm audit --omit=dev --json` | Non concluant : endpoint npm inaccessible depuis l'environnement |
| `git status --short` | Modifications locales préexistantes : `.env.local.example` et trois fichiers source |
| Inventaire | 148 routes API, 64 migrations SQL, 20 Edge Functions suivies |

Les vérifications dynamiques Supabase, les tests de pénétration, la mesure réelle des temps SQL, la validation des fournisseurs externes et l'audit des secrets historiques restent à exécuter dans un environnement de staging isolé.

## 10. Plan d'action priorisé

### P0 — Avant release

1. Rendre Vitest exécutable : corriger `src/test/setup.ts`, les types de tests et obtenir un premier run vert.
2. Corriger les 157 erreurs ESLint bloquantes ou établir un budget temporaire explicite.
3. Rendre privés les buckets de contrats, mandats, dossiers et pièces jointes ; remplacer les URLs publiques par des URLs signées.
4. Auditer les routes utilisant `service_role` avec des tests cross-user/cross-role et corriger les prédicats d'ownership.
5. Supprimer ou isoler la route de seed destructive.
6. Bloquer l'impersonation Edge par `service_role`/`x-user-id` et imposer les contrôles d'autorisation dans les fonctions.

### P1 — 1 à 2 sprints

1. Unifier l'authentification et l'effective role.
2. Corriger les contacts publics, les limites de recherche et les filtres PostgREST.
3. Mettre le rate limiting dans un stockage partagé.
4. Ajouter tests API des accès anonymes, mauvais rôles, cross-tenant, paiements, baux, signature et KYC.
5. Aligner package manager, runtime, Capacitor et pipeline CI.
6. Définir redaction, corrélation et rétention des logs.
7. Ajouter idempotence et vérification cryptographique des callbacks paiement/signature.

### P2 — 2 à 4 sprints

1. Découper le dashboard et les handlers par domaines.
2. Remplacer `select('*')` et agrégations mémoire par DTOs/projections/RPC.
3. Réduire et tester les subscriptions Realtime.
4. Analyser le bundle, lazy-loader les modules lourds et standardiser les images.
5. Modéliser précisément les permissions d'agents d'agence.
6. Nettoyer la documentation, les migrations et les artefacts générés.

### P3 — Amélioration continue

1. Générer et valider un contrat OpenAPI.
2. Ajouter seuils de couverture et tests de migration sur base vierge.
3. Mettre en place SAST, secret scanning, dependency scanning et DAST en CI.
4. Formaliser rétention, suppression et gouvernance des données KYC/documents.

## 11. Conclusion

Le projet possède une couverture fonctionnelle et une séparation métier prometteuses. Sa priorité n'est pas d'ajouter de nouvelles fonctionnalités, mais de rendre les frontières de confiance explicites et vérifiables : stockage privé, autorisation uniforme, session unique, tests exécutables, types et lint fiables, callbacks idempotents et observabilité sans données sensibles. Une fois ces P0 traités, les optimisations de requêtes, de Realtime et de découpage du dashboard pourront être menées avec un risque nettement réduit.

## 12. Suivi de mise en œuvre

### Corrections appliquées

- Ajout de `src/test/setup.ts` avec `@testing-library/jest-dom` et environnement Supabase de test.
- Séparation de Vitest et Playwright dans la configuration Vitest ; ajout des scripts `test:e2e` et `test:e2e:headed`.
- Correction des erreurs de typage de tests, des mocks incomplets et d'un objet avec propriété dupliquée.
- Adaptation des tests obsolètes au comportement actuel du cycle de vie, des dossiers locatifs et des réponses 404 anti-énumération.
- Compatibilité middleware avec le cookie de session SMS sans redirection HTML des routes API déjà couvertes par un handler.
- Ajout de la route publique `/api/properties/reviews` à la classification middleware.
- Utilisation de `active_role` pour les contrôles TC et notifications.
- Limitation des requêtes de catalogue à 100 éléments, plafonnement du mode `all` à 1 000 éléments et nettoyage des termes de recherche PostgREST.
- Respect de `show_email` et `show_phone` dans les réponses publiques de biens.
- Expiration des dossiers locatifs rendue non bloquante pour l'opération utilisateur.
- Les buckets créés dynamiquement ne sont publics que pour les médias de catalogue ; les nouveaux buckets de documents sont privés par défaut.
- Standardisation vers npm dans le README et le démarrage standalone Node ; ajout de `packageManager`.
- Nettoyage de `.gitignore` et exclusion des rapports E2E générés.

### Points non appliqués automatiquement

- **Buckets déjà publics :** changer leur visibilité nécessite une migration Supabase et une refonte des consommateurs d'URLs publiques vers des URLs signées. Une bascule automatique casserait les contrats, mandats et pièces jointes déjà persistés ; elle doit être déployée avec migration, endpoints de téléchargement autorisés et ré-encodage des URLs.
- **Clé `service_role` dans les Edge Functions :** les proxys existants utilisent ce mécanisme pour les sessions SMS. Le remplacer partout exige un protocole d'assertion interne signé partagé entre Next et Deno ; le changement n'a pas été fait partiellement afin de ne pas casser les flux KYC/signature.
- **Rétention et gouvernance KYC :** la durée légale, les responsables de traitement et les exigences de suppression n'étant pas définis dans le dépôt, aucune règle métier de purge n'a été inventée.
- **Permissions détaillées des agents d'agence :** le schéma prévoit des capacités mais leur matrice fonctionnelle n'est pas spécifiée ; seule une centralisation complète des politiques permettra une correction sûre.
- **157 erreurs ESLint `react-hooks/set-state-in-effect` :** ces erreurs sont réparties dans de nombreux composants et leur correction nécessite une refonte contrôlée des effets, des fetchs et des subscriptions. Elles restent bloquantes et ne sont pas masquées par une désactivation globale de la règle.
- **Audit npm distant et tests Supabase réels :** l'accès au registre npm et à un projet Supabase de staging n'est pas disponible dans cet environnement.
