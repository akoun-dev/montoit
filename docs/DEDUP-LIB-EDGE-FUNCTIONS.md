# DÉDUP — lib Next.js ↔ Edge Functions `_shared/` (DAT-004)

- **Task ID** : DAT-004 / 5-a · **Agent** : DEV BACKEND FINISHER · Branche 4.0.0
- **Contexte** : deux runtimes implémentent les mêmes intégrations externes —
  `src/lib/*` (Node/Next.js, server-side) et `supabase/functions/_shared/*`
  (Deno). Historiquement copiés-collés, ils ont **divergé** (codes succès
  CRYPTONEO, types RNPP, messages d'erreur). Ce document fait foi pour la
  matrice, le contrat commun et le plan de traitement par intégration.
- **Règle d'or** : toute logique **pure** (constantes, fonctions sans I/O
  runtime, types/shapes API) va dans `supabase/functions/_shared/<domaine>-contract.ts`
  — runtime-agnostique, **jamais** de `Deno.env`, `process.env`, `Buffer`,
  `npm:` ni URL d'import npm. Les runtimes l'importent et n'ajoutent que la
  couche runtime (env, cache, fetch).

---

## 1. Matrice des duplications

| Domaine | Fichier Node (src/lib) | Fichier Deno (_shared) | Symboles dupliqués (avant traitement) | ~Lignes dup. | État |
|---|---|---|---|---|---|
| **CRYPTONEO (e-signature)** | `src/lib/cryptoneo.ts` (193 l) | `_shared/cryptoneo.ts` (116 l) | `getCryptoneoToken`, `clearCryptoneoToken`, `cryptoneoFetch`, `normalizeCryptoneoGender`, `CRYPTONEO_SUCCESS_CODES`+`isCryptoneoSuccess`, shapes `CryptoneoAuthResponse/CertificatResponse/OtpResponse/SignResponse/VerifyResponse/SignedFileResponse` | ~120 | ✅ **Traité 5-a** — contrat partagé `_shared/cryptoneo-contract.ts` branché des deux côtés (§2) |
| **INTOUCH (paiements)** | `src/lib/intouch.ts` (496 l) | `_shared/intouch.ts` (343 l) | `PAIEMENT_SERVICE_CODES`, `getBasicAuthHeader`, `getDefaultPublicAppUrl/CallbackUrl/WaveReturnUrl/WaveCancelUrl`, `initiatePaiement`, `checkTransactionStatus`, `initiatePaiementImmediat`, `getBalance`, `generatePartnerTransactionId`, `getOperatorLabel` | ~250 | ⏳ P2 — documenté, non partageable tel quel (env `process.env` vs `Deno.env`) ; plan §4.2 |
| **RNPP / ONECI (identité)** | `src/lib/oneci.ts` (client RNPP, 148 l) | `_shared/oneci.ts` (88 l) | `RnppApiError`, `parseBody`, `fetchWithTimeout`, `rnppFetch`, `rnppPerson`, `rnppPersonMatch`, `rnppFaceAuth`, `rnppFingerprintAuth`, `rnppBalance` | ~80 | ⏳ P2 — même logique, types divergés (lib typée, EF `Record<string, unknown>`) ; plan §4.3 |
| **ANSUT messaging (SMS/email)** | `src/lib/ansut-messaging.ts` (289 l) | `_shared/ansut-messaging.ts` (64 l) | `formatPhoneForAnsut`, config env, payloads `SendSMS` / `message/send` | ~60 | ⏳ P3 — l'EF est un **port volontairement minimal** (destinataires sans compte plateforme, cf. en-tête) ; plan §4.4 |
| **Notifications** | `src/lib/notify.ts` (508 l) | `_shared/notify.ts` (39 l) | Insertion table `notifications` (`id`, `user_id`, `type`, `title`, `message`, `action_url`, `entity_id`) | ~15 | ⏳ P3 — signatures différentes **par design** (EF injecte le client, lib utilise l'admin + `notifyMany`) ; contrat = shape de ligne (§4.5) |
| **Client Supabase admin** | `src/lib/supabase/admin.ts` (33 l) | `_shared/supabase-admin.ts` (14 l) | `getSupabaseAdminClient` (singleton service_role) | ~12 | ℹ️ **Ne pas dédupliquer** : noms d'env différents **par design** (`NEXT_PUBLIC_SUPABASE_URL` côté app vs `SUPABASE_URL` côté EF) + typing `Database` côté app uniquement. Contrat d'env documenté (§4.6) |
| **Résolution utilisateur** | `src/lib/auth/request-user.ts` (109 l) | `_shared/auth.ts` (16 l) | `resolveRequestUser` / `resolveUserFromRequest` — même contrat : `Bearer <JWT utilisateur>` **ou** `Bearer <SERVICE_ROLE>` + `x-user-id` | motif | ⏳ P3 — garder strictement alignés (sécurité, cf. RUNBOOK-EDGE-FUNCTIONS-SECURITE §5) ; test de parité §3.2 |
| **CORS** | — | `_shared/cors.ts` | — | — | ℹ️ EF-only, aucune duplication |

Autres vérifiés **non dupliqués** : `src/lib/otp-hash.ts` (app uniquement),
`_shared/cors.ts` (EF uniquement), helpers de storage (app uniquement).

---

## 2. Traitement réalisé — CRYPTONEO (la divergence la plus critique)

### 2.1 Architecture retenue

```
supabase/functions/_shared/cryptoneo-contract.ts   ← SOURCE DE VÉRITÉ (pure, 0 dépendance)
        ▲                                   ▲
        │ import + ré-export                │ import + ré-export
supabase/functions/_shared/cryptoneo.ts   src/lib/cryptoneo.ts
  (Deno : Deno.env, cache token,           (Node : process.env, cache token,
   cryptoneoFetchJson, logs)                getCryptoneoToken, cryptoneoFetch)
```

- `_shared/cryptoneo.ts` **ré-exporte** le contrat (`normalizeCryptoneoGender`,
  `isCryptoneoSuccess`, `CRYPTONEO_SUCCESS_CODES` + les 9 types/shapes) et
  n'héberge plus que la couche Deno. Les 8 Edge Functions consommatrices
  (`sign`, `sign-verify`, `sign-send-otp`, `signed-file`, `signature-auth`,
  `generate-certificate`, `check-certificate`, `retrieve-certificates`)
  continuent d'importer depuis `../_shared/cryptoneo.ts` — **aucun import
  cassé** ; effet secondaire positif : les types qu'elles importaient déjà
  (`CryptoneoUser*`, `SignRequestItem`…) sont désormais réellement exportés.
- `src/lib/cryptoneo.ts` importe le même contrat (module 100 % pur TS, donc
  bundlable par Next/Turbopack) et ré-exporte la surface publique historique.
  La partie Node (`process.env`, cache token 30 min, `cryptoneoFetch` avec
  retry 401) reste locale. TTL branché sur `CRYPTONEO_TOKEN_TTL_MS`.

### 2.2 Divergences corrigées (bug latent côté app)

| Élément | Avant (`src/lib`) | Avant (`_shared`) | Après (contrat) |
|---|---|---|---|
| Codes succès | `{200, 7000, 7002}` | `{200, 7000, 7002, 7003, 7004}` | `{200, 7000, 7002, 7003, 7004}` |
| `code = 0` | **succès** (`!code` falsy) ❌ | erreur ✅ | **erreur** (0 et ≥ 8000 = échec) |
| `code = 7003/7004` | erreur ❌ | succès | succès |
| TTL token | 30 min (local) | 30 min (local) | `CRYPTONEO_TOKEN_TTL_MS` (30 min, marge 60 s) |

Seul consommateur app de `isCryptoneoSuccess` : la route admin
`POST /api/signature/sync-aliases` — **alignement voulu** avec le comportement
des Edge Functions (c'est la correction de la divergence documentée dans
l'en-tête du contrat).

### 2.3 Contraintes toolchain respectées

- Le contrat ne contient **aucune** API runtime (ni `Deno.env`, ni
  `process.env`, ni `Buffer`, ni import `npm:`/`https:`) → importable des deux
  côtés sans mélanger les toolchains.
- Côté Deno, les imports relatifs gardent l'extension `.ts` (obligatoire).
- Côté Next, `tsconfig.json` exclut `supabase/functions` des fichiers racines ;
  le contrat y entre uniquement **via l'import** de `src/lib/cryptoneo.ts`
  (fichier pur, typé par le même programme `tsc`).

---

## 3. Contrat commun à respecter (CRYPTONEO)

Signatures figées (identiques des deux côtés, définies dans
`cryptoneo-contract.ts`) :

```ts
export const CRYPTONEO_TOKEN_TTL_MS: number            // 30 * 60 * 1000
export const CRYPTONEO_SUCCESS_CODES: ReadonlySet<number> // {200,7000,7002,7003,7004}
export function normalizeCryptoneoGender(gender?: string | null): string
export function isCryptoneoSuccess(data: Record<string, unknown>): boolean
// (runtimes) getCryptoneoToken(): Promise<string> — POST {API}/user/auth
//   {appKey, appSecret} → data.data.token ; cache 30 min, marge 60 s
// (runtimes) clearCryptoneoToken(): void
// (runtimes) cryptoneoFetch(path: string, options?: RequestInit, retry = true): Promise<Response>
//   — Bearer token, retry 1× après clear du cache sur 401
// (Deno uniquement) cryptoneoFetchJson(path, options?): {ok, data, error?}
```

Endpoints de référence : `/user/auth`, `/generateCert/users`,
`/generateCert/generateCertificat`, `/otp/send`, `/sign/signFileBatch`,
`/sign/verifySignedBatch`, `/sign/getSignedFile` (shapes dans le contrat).

### 3.1 Règles d'évolution

1. Toute évolution du contrat se fait **d'abord** dans `cryptoneo-contract.ts`.
2. Les deux fichiers runtime ne doivent contenir **aucune** logique de contrat
   (un diff qui ajoute un code succès côté runtime seul est un bug).
3. Les messages d'erreur/log peuvent diverger (les EF logguent en clair, l'app
   reste sobre) — ils ne font pas partie du contrat.

### 3.2 Tests manuels de parité (à rejouer à chaque évolution)

```bash
# 1. Typage
bunx tsc --noEmit                                   # contrat importé via src/lib/cryptoneo.ts
deno check supabase/functions/_shared/cryptoneo.ts  # si Deno disponible (sinon déploiement staging)

# 2. Parité isCryptoneoSuccess / normalizeCryptoneoGender (mêmes résultats attendus)
bun  -e 'import{isCryptoneoSuccess,n}=require("./src/lib/cryptoneo.ts")' # ou petit script TS
deno eval 'import{isCryptoneoSuccess,n}from"./supabase/functions/_shared/cryptoneo-contract.ts"'
# Cas attendus (isCryptoneoSuccess) : {}→true | {code:200}|{code:7000}|{code:7002}|{code:7003}|{code:7004}→true
#   {code:0}→false | {code:8006}→false | {statusCode:8006}→false | {code:"9999"}→false
# Cas attendus (normalizeCryptoneoGender) : homme/M/male/masculin→Homme | femme/F/FEMALE/feminin→Femme | undefined→Homme

# 3. Flux réels après déploiement : signature d'un bail (EF `sign` + OTP),
#    puis côté app : POST /api/signature/sync-aliases (admin) — doit refléter
#    les mêmes codes succès/erreur que la EF `check-certificate`.
```

---

## 4. Plan de traitement par intégration

### 4.1 CRYPTONEO — ✅ fait (5-a, cf. §2)

### 4.2 INTOUCH — P2 (wave 2)

Blocage : partage d'import impossible tel quel (`process.env` vs `Deno.env`;
`src/lib/intouch.ts` portait aussi sur les routes `/api/payments/**` — lane
agent 5-b). Divergences actuelles **cosmétiques** (messages d'erreur, `Buffer`
vs `btoa` — même résultat) mais **aucune divergence de contrat détectée**
(mêmes service codes, mêmes URLs, mêmes payloads).

Étapes prescrites :
1. Extraire `_shared/intouch-contract.ts` (pur) : `PaymentOperator`,
   `PAIEMENT_SERVICE_CODES`, `PaiementParams`/types de réponse,
   `generatePartnerTransactionId`, `getOperatorLabel`, constructeurs d'URL
   (`buildPaiementUrl`, `buildStatusUrl`, `PAIEMENT_IMMEDIAT_URL`) et
   `buildCallbackUrl(callback, secret)` — en recevant `getEnv: (k) => string`.
2. `_shared/intouch.ts` et `src/lib/intouch.ts` deviennent des adapteurs
   (`Deno.env` / `process.env` + `btoa`/`Buffer` + logs).
3. Parité : table de cas `generatePartnerTransactionId` (format
   `MT-<base36>-<6>`), un PAIEMENT sandbox par opérateur via la EF et via
   `/api/payments/initiate`, vérifier `checkTransactionStatus` sur le même
   `transactionId` des deux côtés.

### 4.3 RNPP / ONECI — P2 (wave 2)

Même logique, types divergés (l'EF répond `Record<string, unknown>`).
1. Extraire `_shared/rnpp-contract.ts` (pur) : `RnppApiError`, `parseBody`,
   `fetchWithTimeout` (timeout 30 s), chemins d'endpoints (`/rnpp/persons/:nni`,
   `/match`, `/face-auth`, `/fingerprint-auth`, `/billing/balance`) et les
   interfaces `RnppMatchResponse`/`RnppBiometricResponse`/`RnppBalanceResponse`.
2. Aligner l'EF sur les types de la lib (source la plus précise) ; garder le
   header `X-Api-Key` + gestion 503/504 identiques des deux côtés.
3. Parité : même NNI → `rnppPerson` EF vs `/api/kyc/oneci/person` ; codes
   `Code`/`code` de match et d'auth biométrique identiques.

### 4.4 ANSUT messaging — P3

L'EF est un port **volontairement minimal** (en-tête : destinataires sans
compte plateforme). Traiter uniquement : extraire `formatPhoneForAnsut` +
normalisation `ANSUT_BASE_URL` dans un `_shared/ansut-contract.ts`, documenter
les payloads `SendSMS` / `message/send` (channel Email). Parité : envoi SMS
vers un numéro `07 xx xx xx xx`, `+225…`, `225…` → même E.164 final.

### 4.5 Notifications — P3

Signatures différentes par design (EF : `notify(supabase, params)` ; app :
`notify(params)` sur client admin + `notifyMany`). Contrat à figer : **shape de
la ligne** `notifications` (`id` UUID, `user_id`, `type`, `title`, `message`,
`action_url`, `entity_id`) et la liste fermée des `type`. Ne pas fusionner les
modules.

### 4.6 Supabase admin / auth — pas de fusion

- `getSupabaseAdminClient` : dupliqué **volontairement** (env différentes :
  `NEXT_PUBLIC_SUPABASE_URL` vs `SUPABASE_URL` ; `Database` typé côté app).
  Ne jamais « unifier » les noms d'env.
- Résolution utilisateur : garder `resolveRequestUser` (app) et
  `resolveUserFromRequest` (EF) strictement alignés sur le motif
  « Bearer JWT **ou** service_role + `x-user-id` » (cf.
  RUNBOOK-EDGE-FUNCTIONS-SECURITE §5 et sa recommandation P1 — JWT courte
  durée émis par Next). Toute évolution de l'un implique l'autre dans le même
  changelog.

---

## 5. Checklist d'intégration (wave 2)

1. [ ] `intouch-contract.ts` extrait + adapteurs (agent paiements).
2. [ ] `rnpp-contract.ts` extrait + EF typée (agent KYC/identité).
3. [ ] `ansut-contract.ts` (formatPhone + payloads).
4. [ ] `deno check` des `_shared` en CI (aujourd'hui vérifié à la main — Deno
       absent de l'environnement 5-a).
5. [ ] Réexécuter les tests de parité §3.2 après chaque évolution du contrat.
