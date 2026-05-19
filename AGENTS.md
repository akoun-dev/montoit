# Plan de migration Prisma → Supabase

## Contexte
- L'ancien ORM Prisma (`@/lib/db`) est utilisé dans les routes API et certains services
- La base Supabase est déjà en place avec `getSupabaseAdminClient()` dans `@/lib/supabase/admin`
- L'auth utilise `resolveRequestUser(req)` de `@/lib/auth/request-user` avec `applyCookies(resp)`
- Le mapping snake_case (DB) → camelCase (API) est fait manuellement dans les réponses

## Sprints

### Sprint 1 ✅ — Fondations
- Configurer Supabase admin client
- Ajouter `resolveRequestUser` + `applyCookies`
- Migrer les routes simples : properties, visits, rental-files, owner-files, reviews

### Sprint 2 ✅ — Auth & Communication
- Migrer auth (login, register, check, me, forgot/reset password)
- Migrer messages, notifications, favorites, profile

### Sprint 3 ✅ — Core métier
- Migrer leases (7 fichiers : route, [id], create, sign, contract, terminate, request-sign-otp)
- Migrer payments (4 fichiers : route, [id], initiate, callback)
- Migrer mandats (3 fichiers : route, [id], sign)
- Migrer dashboards (5 fichiers : locataire, proprietaire, agence, tc, admin)

### Sprint 4 ✅ — Routes restantes
- Migrer tc/ (12 fichiers : agent-feedback, agents, certifications, fraud-alerts, inventory-reports, litiges, messages, missions, oneci, ownership-docs, rental-files, verifications)
- Migrer admin/ (3 fichiers : properties-moderation, signalements, users)
- Migrer tenants/ (2 fichiers : route, [id])
- Migrer owner/ (4 fichiers : analytics, finances, rental-files, reviews)
- Migrer agence/ (2 fichiers : agents, commissions)
- Migrer users/ (2 fichiers : route, search)
- Migrer maintenance/ (3 fichiers : route, [id], comments)
- Migrer applications/ (2 fichiers : route, [id])
- Migrer user/ (4 fichiers : 2fa, connection-logs, default-conditions, profile)
- Migrer auth/ partiels (forgot-password, register, reset-password, send-sms-otp, verify-sms-otp)
- Migrer kyc/ (3 fichiers : face-auth, oneci/face-auth, oneci/match)
- Migrer signature/ (3 fichiers : generate-certificate, send-otp, sign)
- Migrer reviews/ (2 fichiers : route, [id]/reply)
- Migrer documents/ (owner-file, rental-file, properties/[id])
- Migrer seed, stats, history, scoring, settings, messages/contacts, oneci, profile/share, rental-files/action, locataire/my-recipients
- Nettoyer fichiers partiellement migrés (admin/system, dashboard/admin, settings/password, user/change-password)

## Prochaines étapes

### Sprint 5 🔄 — Edge Functions (en cours)
- ✅ Créer `supabase/functions/_shared/` (cors, supabase-admin, cryptoneo, oneci, intouch)
- ✅ Créer signature Edge Functions (6) : signature-auth, generate-certificate, sign-send-otp, sign, sign-verify, signed-file
- ✅ Créer KYC Edge Functions (4) : kyc-face-auth (NeoFace), oneci-match, oneci-face-auth, oneci-subscription
- ✅ Créer payment Edge Functions (2) : payment-initiate, payment-callback
- ✅ Transformer les routes Next.js en proxy → Edge Functions (12 fichiers)
  - signature/ (auth, generate-certificate, send-otp, sign, verify, signed-file)
  - kyc/ (face-auth, oneci/match, oneci/face-auth, oneci/subscription)
  - payments/ (initiate, callback)
- 🔜 Tester les Edge Functions localement avec `supabase functions serve`
- 🔜 Déployer avec `supabase functions deploy`

### Sprint 6 — Upload média via Supabase Storage
- Les images et vidéos 3D étaient stockées en base64 dans la DB → très lent, base64 énorme dans les payloads JSON
- Ajouté `PROPERTY_VIDEOS` à `BUCKETS` dans `storage.ts`
- Ajouté `guessExtensionFromMime()`, `isBase64DataUrl()` dans `storage.ts`
- Ajouté les MIME types video dans `guessContentType()`
- POST /api/properties : upload des images vers `property-images`, vidéo vers `property-videos`, stockage des URLs publiques
- PATCH /api/properties/[id] : upload + nettoyage des anciens fichiers storage
- DELETE /api/properties/[id] : nettoyage des fichiers storage orphelins

⚠️ **Action manuelle requise** : créer le bucket `property-videos` dans Supabase (Public, max 50 MB, allowed MIME: `video/mp4,video/quicktime,video/webm`)

Les anciennes données (base64 dans la DB) continuent de fonctionner — seuls les nouveaux uploads passeront par Storage.

### Sprint 7 — Nettoyage Prisma
- Supprimer le package Prisma et `@prisma/client` des dépendances
- Supprimer `@/lib/db` (fichier Prisma client)
- Supprimer les commandes `db:push`, `db:migrate`, `db:seed` du package.json
- Supprimer le dossier `prisma/`
- Supprimer le script `seed.ts`
- Supprimer tout import résiduel de Prisma dans les services (notify, etc.)

## Commandes de vérification
```bash
# Vérifier qu'il ne reste aucun import Prisma dans les routes API
rg "from '@/lib/db'" src/app/api/

# Vérifier les erreurs TypeScript dans les routes API
npx tsc --noEmit 2>&1 | grep "^src/app/api/" | head -20

# ESLint
npx eslint src/app/api/ --max-warnings 200
```
