# Plan de correction — Paliers 1 & 2

Branche dédiée `fix/audit-critique-securite` créée depuis `4.0.0`. Aucune fonctionnalité nouvelle : corrections de bugs runtime, durcissement sécurité et assainissement code.

## PALIER 1 — Critiques (runtime + sécurité)

### 1. Bug annulation bail (`src/app/api/leases/[id]/cancel/route.ts`)
- Le `select('*, property:..., rental_file:...')` fait effondrer l'inférence TS en `never`, et le code lit `lease.tenant_id`/`lease.owner_id` qui ne sont **pas** dans le select des relations.
- **Fix** : typage explicite. Définir un type `LeaseWithRelations` local et caster le résultat de la query (`as LeaseWithRelations`), comme le fait déjà `sign/route.ts`. Ajouter `tenant_id, owner_id, status, property_id, rental_file_id` au select direct (colonnes de `leases`). Contrôle d'autorisation déjà présent (`!== userId`), reste correct.

### 2. Page TC inventaire cassée (`src/components/dashboard/tc/inventory-reports-list.tsx`)
- `usePagination` et `PaginationControls` sont utilisés mais **non importés** (tous les autres fichiers TC les importent depuis `@/hooks/use-pagination` et `@/components/ui/pagination-controls`).
- **Fix** : ajouter les deux imports manquants, à l'identique de `agency-validations.tsx`/`agents.tsx`.

### 3. OTP stockés en clair (12 fichiers)
- Table `otp_codes.code` stocke le code OTP en clair → lecture base = contournement 2FA.
- **Fix** : créer `src/lib/otp-hash.ts` (helper `hashOtpCode(code, phone/email)` → SHA-256 avec sel par identifiant + secret app ; `verifyOtpCode(...)`). Mettre à jour :
  - `auth/send-sms-otp`, `auth/verify-sms-otp`
  - `auth/send-email-otp`, `auth/verify-email-otp`
  - `auth/forgot-password`, `auth/reset-password`
  - `auth/register`
  - `profile/change-email`, `profile/change-email/verify`
  - `profile/change-phone`, `profile/change-phone/verify`
  - **Migration SQL** : l'index existant `idx_otp_codes_code_phone(code, phone)` devient inopérant (on ne peut plus `.eq('code', code)`). La vérification se fera en chargeant les OTP candidats par `(phone/email, type, is_used=false, expires_at>now)` puis `verifyOtpCode` en mémoire (quantité faible, 1 OTP actif par cible). `seed/route.ts` adapté.
- **Note** : le `devCode` retourné hors prod est conservé (utile en dev), mais la base ne contient plus que le hash.

### 4. Webhook paiement non sécurisé (`src/app/api/payments/callback/route.ts`)
- Si `PAYMENT_CALLBACK_SECRET` est absent → `verifyHmacSignature` retourne `true` silencieusement (faille ouverte).
- **Fix** : si le secret est absent → `console.error` + `return false` (rejet). En dev, autoriser un opt-in explicite via `PAYMENT_CALLBACK_INSECURE_SKIP=1`.

### 5. Logs secrets (`src/lib/auth/request-user.ts`, `src/app/api/kyc/face-auth/route.ts`)
- 9 `console.log` dont cookies/tokens/user-id. `request-user.ts` log les noms de cookies et le user.id à chaque requête.
- **Fix** : remplacer par un logger conditionnel `debugLog()` (log seulement si `process.env.NODE_ENV !== 'production'`), ou supprimer les logs de debug. Le log d'erreur (`console.error`) est conservé.

## PALIER 2 — Qualité / assainissement

### 6. Erreurs TypeScript restantes (30 → 0)
- `tc/owner-file-detail.tsx` et `tc/rental-file-detail.tsx` : `useCachedFetch(url, { skipCache }, true)` — le 3e arg `true` n'existe pas dans la signature. **Fix** : supprimer le 3e argument (ou l'intégrer dans l'objet options selon l'usage réel — vérification au cas par cas).
- `scripts/test-full-flow.ts` : `.delete().catch(...)` — les builders Postgrest n'ont pas de `.catch`. **Fix** : wrapper dans `Promise.resolve(...)` ou utiliser `{ error }` destructuring. (Fichier de script, pas runtime.)
- Les erreurs `never` du bail sont résolues par le fix #1.

### 7. `.gitignore` corrompu
- Contient `"Ajule p#"` en début de fichier, doublons, entrées en vrac. **Fix** : réécrire proprement (regroupements commentés, suppression doublons, conservation de toutes les entrées existantes effectives).

### 8. Setup vitest manquant
- `vitest.config.ts` référence `./src/test/setup.ts` qui n'existe pas → `vitest run` échoue avant même de lancer les tests.
- **Fix** : créer `src/test/setup.ts` (import `@testing-library/jest-dom`). N'ajoute pas de tests, mais permet à la commande `npm test` de fonctionner et de recevoir les futurs tests.

## HORS PÉRIMÈTRE (Palier 3, non fait maintenant)
- Validation zod sur les 147 routes (trop volumineux, fera l'objet d'un lot séparé sur routes à risque).
- Réduction des 841 `as any` (dette structurelle, traitement incrémental).
- Les 160 erreurs ESLint `set-state-in-effect` sont des avertissements React 19 sur des patterns existants (`use-cached-fetch`, `use-pagination`) — correction risquée sans tests, reportée.

## Vérification finale
- `npx tsc --noEmit` → 0 erreur sur `src/`.
- `npx eslint .` → stables (pas de nouvelles erreurs).
- `npx vitest run` → démarre sans erreur de module (0 test attendu).
- Lancer le `lint` pour confirmer l'absence de régression sur les fichiers modifiés.

Commit unique par palier logique (bug runtime / sécurité / qualité) sur la branche dédiée. Pas de push sans demande.