# RUNBOOK — Sécurité des Edge Functions (`verify_jwt`) — Mon Toit CI

- **Task ID** : SEC-008 (Sprint 0) · **Agent** : DEV FULLSTACK DATA (4-b) · finitions 5-a
- **Périmètre** : les 26 Edge Functions de `supabase/functions/` (+ `_shared/`)
- **Historique** : ce runbook ne modifiait pas `supabase/config.toml`
  (exclusivité agent 4-c) — le bloc TOML §3 était fourni « prêt à copier ».
  → **Mise à jour 5-a** : le bloc TOML de la section 3 a été **appliqué dans
  `supabase/config.toml`** (14 fonctions métier `verify_jwt = true`, 2 webhooks
  `false`, `signature-auth` laissé commenté) et validé par parse TOML.
  La présente section reste la référence de classification ; l'alternative
  par flags de déploiement (section 4) demeure valable.

---

## 1. Pourquoi `verify_jwt`

Par défaut, une Edge Function Supabase est déployée avec `verify_jwt = true` :
la plateforme rejette (401) toute requête dont l'en-tête `Authorization: Bearer …`
ne contient pas un **JWT signé par Supabase** (JWT utilisateur, clé `anon` ou
clé `service_role`). Les fonctions non authentifiées (webhooks externes, jobs
planifiés appelés avec un secret arbitraire) doivent explicitement opter pour
`verify_jwt = false` et assumer leur propre vérification (secret partagé, HMAC…).

Constat (analyses 1-c / 1-e) : aucune fonction du repo ne déclare de config
`verify_jwt` ; les déploiements historiques ont été faits avec des réglages
inconnus, et plusieurs fonctions sensibles sont appelables sans aucune
authentification (`signature-auth`, `retrieve-certificates`, `sign-verify`).

---

## 2. Classification des 26 Edge Functions

Légende : **VJ** = `verify_jwt` recommandé. « resolveUser » = la fonction
appelle `resolveUserFromRequest()` (`_shared/auth.ts`), qui accepte soit un JWT
utilisateur valide, soit `Bearer <SERVICE_ROLE>` + en-tête `x-user-id`
(motif utilisé par le backend Next pour les sessions SMS — cf. section 5).

### 2.1 Fonctions utilisateur / métier — `verify_jwt = true`

| Fonction | Rôle | Auth en code | VJ | Notes |
|---|---|---|---|---|
| `kyc-face-auth` | KYC NeoFace (OCR CNI, selfie) | resolveUser | **true** | PII biométrique |
| `oneci-match` | Match identitaire RNPP/ONECI | resolveUser | **true** | PII état civil |
| `oneci-face-auth` | Biométrie visage RNPP | resolveUser | **true** | payload ≤ 2 Mo |
| `oneci-fingerprint-auth` | Biométrie empreinte RNPP | resolveUser | **true** | payload ≤ 1 Mo |
| `oneci-person` | Consultation personne par NNI | resolveUser | **true** | À restreindre ADMIN/TC côté code |
| `oneci-subscription` | Solde RNPP (ADMIN) | resolveUser | **true** | Vérifier rôle ADMIN en code |
| `payment-initiate` | Initie un paiement Intouch | resolveUser | **true** | Ordonne des débits |
| `payment-transfer` | Paiement immédiat ADMIN/AGENCE | resolveUser | **true** | Transferts d'argent — critique |
| `generate-certificate` | Certificat CRYPTONEO | resolveUser | **true** | Consent posé serveur |
| `check-certificate` | Sync alias CRYPTONEO | resolveUser | **true** | |
| `sign` | Signature batch CRYPTONEO + upload PDF signé | resolveUser | **true** | Vérifie aussi l'OTP CRYPTONEO |
| `sign-send-otp` | Envoi OTP signature MAIL/SMS | resolveUser | **true** | ⚠️ restreindre la cible (spam) |
| `signed-file` | Stream du PDF signé | resolveUser | **true** | |
| `retrieve-certificates` | Annuaire certificats CRYPTONEO | **aucune** | **true** | 🔴 fuite PII (nom, email, tél., n° série). Le backend Next (`/api/certificates/*`) l'appelle déjà avec `getEdgeFunctionBearerToken` → activer VJ sans casser le flux applicatif |
| `signature-auth` | Proxy token CRYPTONEO | **aucune** | **true** *(conditionnel)* | Nécessite de rendre `/api/signature/auth` (Next, public) authentifié et de lui faire relayer un Bearer JWT — sinon 401 pour les appels anonymes actuels |

### 2.2 Webhooks / entrants externes — `verify_jwt = false`

| Fonction | Rôle | VJ | Protection de remplacement (obligatoire) |
|---|---|---|---|
| `payment-callback` | Webhook Intouch (POST/GET) | **false** | HMAC/secret `INTOUCH_CALLBACK_SECRET` **obligatoire et fail-closed** (V3) ; désactiver le GET ou le signer |
| `sign-verify` | Callback CRYPTONEO (statut signature) | **false** | Ajouter un secret partagé dans l'URL de callback (`callBackUrl?secret=…` en header de préférence) — aujourd'hui toute personne peut déclencher l'upload du fichier signé (V10) |
| `_test` | Hello-world de dev | false | **À supprimer** (CORS `*`, reliquat de dev) |

### 2.3 Jobs planifiés (crons) — `verify_jwt = false` (voir note)

| Fonction | Rôle | VJ | Protection |
|---|---|---|---|
| `generate-monthly-payments` | Loyers PENDING du mois suivant | **false** | Check `CRON_SECRET` en code (Bearer = secret) |
| `check-overdue-payments` | PENDING → LATE + notifs | **false** | Check `CRON_SECRET` + claim atomique |
| `remind-lease-expiring` | Rappel J-60 fin de bail | **false** | Check `CRON_SECRET` |
| `remind-pending-lease-signatures` | Relance signatures 48 h | **false** | Check `CRON_SECRET` |
| `remind-upcoming-payments` | Rappels J-3/J-1 | **false** | Check `CRON_SECRET` |
| `remind-upcoming-visits` | Rappels visites J-1 | **false** | Check `CRON_SECRET` |
| `expire-stale-listings` | Annonces expirées → SUSPENDED | **false** | Check `CRON_SECRET` |
| `expire-stale-rental-files` | Dossiers VALIDATED expirés | **false** | Check `CRON_SECRET` |

> **Note crons** : `verify_jwt = true` exige un JWT signé Supabase. Si le
> planificateur envoie `Authorization: Bearer $CRON_SECRET` (secret arbitraire,
> ce que le code attend aujourd'hui), `verify_jwt` doit rester `false` — la
> protection est alors le check du secret **dans la fonction**. Pour passer les
> crons en `verify_jwt = true`, faire appelable le scheduler avec
> `Bearer $SUPABASE_SERVICE_ROLE_KEY` (JWT valide) et déplacer la vérification
> sur `CRON_SECRET` → header dédié (ex. `x-cron-secret`). Recommandation
> progressive, à coordonner avec la configuration du planificateur.

---

## 3. Configuration TOML (appliquée dans `supabase/config.toml` — 5-a)

Le bloc ci-dessous a été reporté dans `supabase/config.toml` (fin du fichier,
section « SEC-008 · verify_jwt des Edge Functions NON planifiées ») et validé
par parse TOML (24 entrées `[functions.*]`). Il est conservé ici comme
référence de classification :

```toml
# ── SEC-008 · verify_jwt par fonction ─────────────────────────────────────
# Fonctions utilisateur/métier : JWT Supabase obligatoire
[functions.kyc-face-auth]
verify_jwt = true

[functions.oneci-match]
verify_jwt = true

[functions.oneci-face-auth]
verify_jwt = true

[functions.oneci-fingerprint-auth]
verify_jwt = true

[functions.oneci-person]
verify_jwt = true

[functions.oneci-subscription]
verify_jwt = true

[functions.payment-initiate]
verify_jwt = true

[functions.payment-transfer]
verify_jwt = true

[functions.generate-certificate]
verify_jwt = true

[functions.check-certificate]
verify_jwt = true

[functions.sign]
verify_jwt = true

[functions.sign-send-otp]
verify_jwt = true

[functions.signed-file]
verify_jwt = true

[functions.retrieve-certificates]
verify_jwt = true

# signature-auth : passer à true APRÈS avoir authentifié /api/signature/auth côté Next
# [functions.signature-auth]
# verify_jwt = true

# Webhooks entrants externes (auth par secret applicatif, pas de JWT Supabase)
[functions.payment-callback]
verify_jwt = false

[functions.sign-verify]
verify_jwt = false

# Crons (auth par CRON_SECRET vérifié en code — cf. note §2.3)
[functions.generate-monthly-payments]
verify_jwt = false

[functions.check-overdue-payments]
verify_jwt = false

[functions.remind-lease-expiring]
verify_jwt = false

[functions.remind-pending-lease-signatures]
verify_jwt = false

[functions.remind-upcoming-payments]
verify_jwt = false

[functions.remind-upcoming-visits]
verify_jwt = false

[functions.expire-stale-listings]
verify_jwt = false

[functions.expire-stale-rental-files]
verify_jwt = false

# _test : à supprimer (reliquat de dev, CORS *)
```

---

## 4. Application au déploiement (alternative)

Sans toucher `config.toml`, le flag CLI s'applique par fonction :

```bash
# VJ true (défaut) — fonctions utilisateur/métier
supabase functions deploy kyc-face-auth
supabase functions deploy retrieve-certificates
# …

# VJ false — webhooks et crons
supabase functions deploy payment-callback --no-verify-jwt
supabase functions deploy generate-monthly-payments --no-verify-jwt
# …
```

⚠️ `--no-verify-jwt` en déploiement **remplace** la valeur de config : garder
les deux sources synchronisées pour éviter les régressions.

---

## 5. Fonctions lisant le bearer `service_role` + `x-user-id`

`_shared/auth.ts` → `resolveUserFromRequest()` accepte deux modes :

1. `Authorization: Bearer <JWT utilisateur>` — JWT vérifié via
   `supabase.auth.getUser(token)` (chemin privilégié) ;
2. `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>` + en-tête `x-user-id` —
   utilisé quand l'utilisateur est connecté par **session SMS custom**
   (pas de JWT Supabase). Le backend Next n'expose ce motif **que** via
   `getEdgeFunctionBearerToken(accessToken, authSource)` (`src/lib/`),
   qui ne renvoie la clé service_role que si `authSource === 'session'`
   et jamais à des requêtes non authentifiées.

**13 fonctions** consomment ce motif (toutes via `resolveUserFromRequest`) :
`check-certificate`, `generate-certificate`, `kyc-face-auth`,
`oneci-face-auth`, `oneci-fingerprint-auth`, `oneci-match`, `oneci-person`,
`oneci-subscription`, `payment-initiate`, `payment-transfer`,
`sign-send-otp`, `sign`, `signed-file`.

**17 routes Next** utilisent `getEdgeFunctionBearerToken` (vérifié) :
`api/certificates/check`, `api/certificates/retrieve`, `api/kyc/face-auth`,
`api/kyc/oneci/face-auth`, `api/kyc/oneci/fingerprint-auth`,
`api/kyc/oneci/match`, `api/kyc/oneci/person`, `api/kyc/oneci/subscription`,
`api/leases/[id]/request-sign-otp`, `api/leases/[id]/sign`,
`api/mandats/[id]/request-sign-otp`, `api/mandats/[id]/sign`,
`api/signature/generate-certificate`, `api/signature/send-otp`,
`api/signature/sign`, `api/signature/signed-file`, `api/signature/verify`.

> ⚠️ Toute fuite de `SUPABASE_SERVICE_ROLE_KEY` combinée à ces fonctions donne
> une usurpation d'identité totale (`x-user-id` cru par la fonction).
> Amélioration recommandée (P1) : remplacer le motif service-role + `x-user-id`
> par un JWT courte durée émis par le serveur Next.

---

## 6. Checklist de mise en œuvre

1. [x] Copier le bloc TOML §3 dans `supabase/config.toml` — **fait (5-a)** : 14 fonctions métier `true`, 2 webhooks `false`, `signature-auth` commenté ; les 8 crons (4-c) étaient déjà en place.
2. [ ] Supprimer `supabase/functions/_test`.
3. [ ] Rendre `INTOUCH_CALLBACK_SECRET` obligatoire (fail-closed) dans `payment-callback` et `/api/payments/callback`.
4. [ ] Ajouter un secret partagé au callback `sign-verify` (URL `callBackUrl`).
5. [ ] Authentifier `/api/signature/auth` côté Next, puis activer `verify_jwt = true` sur `signature-auth`.
6. [ ] Vérifier `retrieve-certificates` : activer VJ et confirmer que `/api/certificates/retrieve` envoie bien un Bearer valide (déjà le cas via `getEdgeFunctionBearerToken`).
7. [ ] Après déploiement : rejouer les flux critiques (paiement initiate/callback, signature bail, KYC) — un 401 inattendu = un appelant sans JWT à corriger.
