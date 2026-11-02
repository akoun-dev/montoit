# 1-c — Analyse BACKEND / API / AUTH / SÉCURITÉ — Mon Toit CI (branche 4.0.0)

- **Task ID** : 1-c | **Agent** : DEV SÉCURITÉ + BACKEND (Explore) | **Mode** : lecture seule (aucun code modifié)
- **Périmètre** : `src/app/api/**` (162 fichiers `route.ts`, ~215 handlers HTTP), `middleware.ts`, `src/lib/supabase/*`, `src/lib/{session,rate-limiter,otp-hash,intouch,oneci,cryptoneo,storage,message-attachments}.ts`, `supabase/migrations/*` (80 migrations SQL), `supabase/functions/*` (27 Edge Functions), `next.config.ts`, `Caddyfile`, `.env*`, `git ls-files`.
- **Contexte issu du worklog (Task 1 / Sprint 4-5)** : migration Prisma → Supabase terminée (pattern `resolveRequestUser` + `getSupabaseAdminClient` + `applyCookies`), 12 routes Next.js proxyfiées vers Edge Functions, secrets ONECI historiquement écrits dans `.env`.

> Note : l'énoncé mentionne 169 fichiers ; le scan réel (`rg --files src/app/api -g 'route.ts'`) donne **162 fichiers de routes** (+ helpers `src/lib`). Les 215 endpoints sont tous couverts dans l'inventaire.

---

## 1. INVENTAIRE API PAR DOMAINE

Légende : 🔓 public (middleware ne bloque pas + pas de vérif en route) | 🔒 auth requis (`resolveRequestUser`) | 🛡 rôle vérifié en route (en plus du middleware). Méthodes listées = handlers exportés.

### 1.1 auth/ — 11 routes (publiques par design, `PUBLIC_ROUTE_PREFIXES = ['/api/auth/']`)
| Route | Méthodes | Auth | Fonctions / remarques |
|---|---|---|---|
| `/api/auth/register` | POST | 🔓 | Inscription email+OTP ou SMS+OTP. **`role` pris du body sans whitelist → auto-attribution ADMIN/TIERS_CONFIANCE (🔴 V1)**. Pas de rate-limit (bombing SMS possible). Énumération par message « compte existe déjà ». |
| `/api/auth/login` | POST | 🔓 | Email/mot de passe → `supabase.auth.signInWithPassword`. Si email non vérifié → OTP EMAIL_VERIFY envoyé + `devCode` en dev. |
| `/api/auth/send-sms-otp` | POST | 🔓 | OTP 6 chiffres, rate-limit 3/min/numéro, OTP stocké **en clair**. 404 si numéro inconnu (énumération). |
| `/api/auth/verify-sms-otp` | POST | 🔓 | Vérif OTP (rate-limit 10/min), anti-rejeu OK (CAS `is_used`), crée **session custom 30 j** (cookie `montoit-session`). |
| `/api/auth/send-email-otp` / `verify-email-otp` | POST | 🔓 | OTP email — **verify-email-otp SANS rate-limit (🟠 V6)** ; gère aussi PASSWORD_RESET → reset possible par brute-force. |
| `/api/auth/verify-phone-otp` | POST | 🔓 | Vérif téléphone (rate-limité). |
| `/api/auth/forgot-password` / `reset-password` | POST | 🔓 | Reset : email → `auth.admin.updateUserById` ; SMS → met à jour **seulement `users.password_hash`** (bcrypt) mais le login n'utilise QUE Supabase Auth → **système de mots de passe double incohérent (🟡 V13)**. |
| `/api/auth/logout` | POST | 🔒 | Supprime sessions DB + cookie. |
| `/api/auth/me` | GET | 🔒 | Profil courant (exclut `password_hash`). |

### 1.2 admin/ — 15 routes, toutes 🛡 ADMIN (double contrôle : middleware `/api/admin/` + `profile.role !== 'ADMIN'` en route)
audit-logs (GET), backups (GET/POST), backups/[id] (DELETE), backups/[id]/download (GET), backups/[id]/restore (POST), properties-moderation (GET/PATCH), reports (GET), reviews (GET/PATCH), settings (GET/PUT), settings/test-channel (POST), signalements (GET/PATCH/POST), system (GET), users (GET/PATCH).
⚠️ `backups/[id]/download` télécharge des dumps DB — protégé ADMIN mais : volume sensible, pas d'audit des téléchargements, pas de chiffrement.

### 1.3 tc/ — 18 routes, toutes 🛡 TIERS_CONFIANCE (helper `authorizeTC` : `active_role === 'TIERS_CONFIANCE'`)
agent-feedback, agents (GET/POST/PATCH/DELETE), certifications, fraud-alerts, inventory-reports, litiges, messages, missions, oneci, owner-files, ownership-docs, properties, properties/[id]/unpublish, rental-files, signal-property, users, verifications, warn-owner. Requêtes systématiquement scopées par `tc_id`/`agent` → bon cloisonnement inter-TC.

### 1.4 agence/ — 6 routes 🛡 AGENCE
agents (GET/POST), agents/[id]/properties (POST/DELETE), commissions (GET/PATCH), legal-documents (GET/POST/DELETE), settings (GET/PUT), users (GET).

### 1.5 properties/ — 7 routes
| Route | Méthodes | Auth | Remarques |
|---|---|---|---|
| `/api/properties` | GET/POST | GET 🔓 / POST 🛡 (PROPRIETAIRE/AGENCE) | Listing public via admin client (OK pour catalogue). `?mine=true` et `?pending=true` vérifient l'utilisateur en route. |
| `/api/properties/[id]` | GET/PATCH/DELETE | 🔒 (ownership vérifié) | |
| `/api/properties/[id]/documents` (+`[docId]`) | GET/POST/DELETE | 🔒🛡 | Upload base64 → bucket **public** `property-documents`. |
| `/api/properties/[id]/inventory-reports` | GET | 🔓 **intentionnellement public** | États des lieux COMPLETED/SIGNED d'un bien via service-role → fuite partielle d'infos logement (🟡). |
| `/api/properties/reviews` | GET | 🔓 | Avis publics. |
| `/api/properties/signal` | POST | 🔒 | Signalement. |

### 1.6 owner/ + owner-file/ — 8 routes 🛡 PROPRIETAIRE
analytics, finances, rental-files, reviews (GET) ; owner-file (GET/POST), documents (GET/POST/DELETE), **documents/upload-url (POST — signed upload URL, ownership vérifié, MAIS ext. non filtrée et bucket public, 🟠 V8)**, withdraw (POST).

### 1.7 leases/ — 9 routes 🔒
route (GET), [id] (GET/PATCH/DELETE), create (POST 🛡), sign (POST — signature manuscrite base64 + OTP CRYPTONEO propriétaire), request-sign-otp, contract (GET — PDF via LibreOffice), terminate, cancel, deposit-refund (GET/PATCH). Ownership vérifié en route (owner_id/tenant_id).

### 1.8 mandats/ — 5 routes 🔒🛡 (PDF, OTP, signature — même modèle que leases)

### 1.9 payments/ — 8 routes
| Route | Méthodes | Auth | Remarques |
|---|---|---|---|
| `/api/payments` | GET | 🔒 | Liste scope user. |
| `/api/payments/[id]` | GET/PUT | 🔒🛡 | |
| `/api/payments/initiate` | POST | 🔒 (JWT Supabase requis) | Proxy → Edge `payment-initiate` (validation rôle/montant/téléphone côté edge). |
| `/api/payments/paiement-immediat` | POST | 🔒 (JWT requis) | Proxy → Edge `payment-transfer` (ADMIN/AGENCE, **pas de plafond de montant 🟠 V9**). |
| `/api/payments/callback` | GET/POST | 🔓 | **Webhook public**. HMAC `x-webhook-signature` (timing-safe) MAIS **fail-open si `PAYMENT_CALLBACK_SECRET` absent (🔴 V3)** ; GET non signé relayé tel quel vers l'Edge Function. |
| `/api/payments/balance`, `/advance`, `/check-overdue` | GET/POST | 🔒 | |

### 1.10 messages/ (4), notifications/ (1), maintenance/ (3), disputes/ (1), visits/ (3), applications/ (2), reviews/ (2), favorites/ (2), search-alerts/ (2), rental-file/ (3 + rental-files/[id]/action), renewals/ (2), tenants/ (2) — 🔒
Toutes auth requises, scoping par userId/lease/property. `visits/remind` 🛡 AGENCE. Messaging : helper `canMessageParticipant` (relation candidature/bail) — bien conçu mais limité aux couples LOCATAIRE↔PROPRIETAIRE.

### 1.11 profile/ (7), user/ (8), settings/ (3) — 🔒
profile/avatar (POST/DELETE — validation MIME data-URL + 2 Mo ✔), change-email/change-phone + verify (OTP + rate-limit ✔), share, user/2fa, user/change-password (bcrypt 12 ✔), user/switch-role (whitelist LOCATAIRE/PROPRIETAIRE/rôle de base ✔ — mais AGENCE peut activer PROPRIETAIRE 🟡), user/delete-account, settings/password, settings/sessions, settings/notifications.

### 1.12 dashboard/ — 5 routes 🛡 (un GET par rôle : locataire, proprietaire, agence, tc, admin)

### 1.13 kyc/ (6), oneci/ (1), signature/ (7), certificates/ (2) — proxys Edge Functions
- `kyc/face-auth` (POST, 🔒+rate-limit) ; `kyc/oneci/*` (🔒 via `resolveRequestUser`) ; `oneci/verify` (🔒).
- `signature/*` : proxys vers Edge Functions CRYPTONEO — `signature/auth` 🔓 (proxy nu), les autres 🔒 (JWT ou service-role + `x-user-id`).
- `certificates/check|retrieve` (🔒).

### 1.14 Divers (7)
`/api/route.ts` (GET "Hello world" 🔓), `/api/stats` (GET 🔓 — agrégats via service-role), `/api/seed` (POST 🔒🛡 ADMIN, **bloqué en production** ✔, mot de passe démo `demo1234`), `/api/suta` (POST/DELETE 🔒 + rate-limit 20/min — chatbot Azure OpenAI), `/api/history`, `/api/scoring`, `/api/migrate-videos`.

---

## 2. ARCHITECTURE AUTHENTIFICATION (diagramme texte)

```
                            ┌────────────────────────────── Navigateur / App Capacitor ─────────────────────────────┐
                            │  Cookies: sb-<ref>-auth-token (Supabase SSR)  +  montoit-session (token custom 96 hex) │
                            └────────────────────────────────────────┬───────────────────────────────────────────────┘
                                                                     │ (httpOnly, SameSite=Lax, secure en prod, 30 j)
                                                                     ▼
  ┌────────────────────────────────────────── middleware.ts (Edge) ─────────────────────────────────────────────────┐
  │  PUBLIC: /api/auth/*, /api/properties/reviews, /api/properties (GET exact)                                      │
  │  PROTECTED_API_PREFIXES (21 préfixes) → blocage SI pas de user Supabase ET pas de cookie 'montoit-session'      │
  │  ⚠️ présence du cookie suffit (valeur non vérifiée) ; vérif rôle SEULEMENT si user Supabase → rôles non         │
  │     vérifiés pour les sessions SMS au niveau middleware (délégué aux route handlers)                            │
  │  ROLE_ROUTES: LOCATAIRE/PROPRIETAIRE/AGENCE/ADMIN/TIERS_CONFIANCE → dashboard/*, api/<rôle>/*                   │
  └───────────────────────────────────────────────────────┬─────────────────────────────────────────────────────────┘
                                                          ▼
  ┌─────────────────────────── Route handler — resolveRequestUser(req) (src/lib/auth/request-user.ts) ──────────────┐
  │ 1) supabase.auth.getUser()  → JWT vérifié par le serveur Auth  (SECURE)                                         │
  │    └ fallback supabase.auth.getSession() → lit le cookie SANS vérification cryptographique (🔴 V2)              │
  │ 2) sinon cookie 'montoit-session' → lookup table `sessions` (token, expires_at) via SERVICE-ROLE                │
  │    └ retourne { userId, authSource: 'supabase'|'session'|null, applyCookies }                                   │
  │ 3) Chaque route : contrôle 401 puis vérif de rôle en base (role/active_role) → accès via SERVICE-ROLE           │
  │    (getSupabaseAdminClient() → bypass RLS TOTAL : toute la sécurité applicative repose sur le code)             │
  └─────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                          │
   Flux OTP : register/send-*-otp → otp_codes (code CLAIR, expiry 5 min env. OTP_EXPIRY_MINUTES, is_used)
             → ANSUT SMS/Email (src/lib/ansut-messaging.ts) → verify-*-otp (anti-rejeu CAS) → session custom 30 j
   Edge Functions : Authorization Bearer <JWT user> ; si authSource='session' → Bearer SERVICE_ROLE + header
             x-user-id (get-edge-function-bearer-token.ts) ; _shared/auth.ts: token===SERVICE_ROLE → x-user-id cru
```

- **Deux systèmes de sessions cohabitent** : Supabase Auth (email/mdp, JWT 1 h + refresh rotation, cf. `supabase/config.toml`) et sessions SMS custom (table `sessions`, token 48 octets aléatoires ✔, 30 jours glissants, cookie httpOnly ✔). `applyCookies` glisse le cookie mais **pas** la ligne DB `sessions.expires_at` (🟡).
- `getUserRole` (middleware) lit `users.role/active_role` avec le client anon → RLS `users_select_own` autorise (uid = soi). OK.
- Session/OTP : bcryptjs (coût 12) utilisé pour `password_hash` ✔ ; `otp-hash.ts` (SHA-256 + pepper + timing-safe) **existe mais n'est importé NULLE PART** → les OTP sont stockés **en clair** dans `otp_codes` (🟠 V5).
- `startRateLimiterCleanup` jamais appelé → Map de rate-limit jamais purgée (🟡, fuite mémoire lente).

---

## 3. MATRICE ROUTE → RÔLE → AUTH (synthèse)

| Domaine | Middleware (préfixe) | Contrôle en route | Rôle requis | Accès DB |
|---|---|---|---|---|
| /api/auth/* | 🔓 public | — | — | service-role |
| /api/properties (GET), /reviews (GET), [id]/inventory-reports (GET), /stats, /api/route.ts | 🔓 | — (inventory-reports/stats sans user) | — | service-role |
| /api/payments/callback | 🔓 | HMAC (fail-open) | — | service-role (edge) |
| /api/signature/auth | 🔓 | — | — | edge → CRYPTONEO |
| dashboard/locataire, /api/locataire/ | 🛡 rôle | ✔ active_role | LOCATAIRE | service-role |
| dashboard/proprietaire, /api/owner*, /api/owner-file* | 🛡 rôle | ✔ active_role | PROPRIETAIRE | service-role |
| dashboard/agence, /api/agence/ | 🛡 rôle | ✔ active_role | AGENCE | service-role |
| dashboard/tc, /api/tc/ (18) | 🛡 rôle | ✔ `authorizeTC` active_role | TIERS_CONFIANCE | service-role |
| dashboard/admin, /api/admin/ (15) | 🛡 rôle | ✔ `profile.role !== 'ADMIN'` | ADMIN (role de base) | service-role |
| leases, mandats, payments, visits, applications, messages, maintenance, disputes, reviews, favorites, search-alerts, rental-file(s), renewals, tenants, notifications, profile, user, settings, kyc, certificates, suta, history, scoring | 🔒 | ownership/user_id en route | tout utilisateur actif | service-role |

**Point clé** : 146/162 fichiers appellent `resolveRequestUser` ; les 16 restants sont : 11 auth/* publiques + stats + properties/[id]/inventory-reports + payments/callback + signature/auth + route.ts racine. La couche de sécurité réelle = code applicatif (RLS systématiquement contournée par le service-role).

---

## 4. AUDIT SÉCURITÉ — VULNÉRABILITÉS ET CRITICITÉ

### 🔴 CRITIQUE (à corriger avant toute mise en prod)

**V1 — Auto-attribution du rôle à l'inscription (escalade ADMIN/TIERS_CONFIANCE)**
`src/app/api/auth/register/route.ts` lignes 105/193/218 : `role: role || 'LOCATAIRE'` avec `role` **issu du body, sans whitelist**. L'enum DB `user_role` inclut `ADMIN` et `TIERS_CONFIANCE` → `POST /api/auth/register {role:"ADMIN"}` crée un compte ADMIN (et le flux SMS mène à une session 30 j).
*Reco* : whitelist serveur `['LOCATAIRE','PROPRIETAIRE','AGENCE']` (séparer choix agence vs propriétaire selon business), ignorer tout autre rôle ; migrer + purge des users à rôle illicite existants ; tester en CI.

**V2 — Fallback d'authentification non vérifié `supabase.auth.getSession()`**
`resolveRequestUser` retombe sur `getSession()` quand `getUser()` ne renvoie rien. `getSession()` (@supabase/ssr) décode le cookie **sans vérifier la signature JWT** : un attaquant peut forger les cookies sb-* avec un `sub` arbitraire → usurpation de n'importe quel userId (y compris ADMIN) sur les 146 routes. `getUser()` vérifie ; `getSession()` non — c'est l'anti-pattern documenté Supabase.
*Reco* : supprimer le fallback `getSession()` (ou vérifier le JWT manuellement via `jwt.verify` avec le secret/JWKS) ; en cas d'erreur `getUser()`, traiter comme non authentifié.

**V3 — Webhook paiement fail-open + GET non signé**
`/api/payments/callback` : si `PAYMENT_CALLBACK_SECRET` n'est pas défini → HMAC **skippé** (`return true` avec simple warn). L'Edge Function `payment-callback` a le même fail-open sur `INTOUCH_CALLBACK_SECRET`, et son **GET accepte de marquer un paiement SUCCESS** avec de simples query params. Combiné au proxy GET non signé, quiconque connaît/génère un `partner_transaction_id` peut valider un loyer sans payer (la génération du txId est prévisible côté `generatePartnerTransactionId`).
*Reco* : fail-CLOSED (401 si secret absent), secret obligatoire en prod, désactiver le GET ou l'exiger signé + secret en header (pas en query, il finit dans les logs), comparer en timing-safe, vérifier le montant du callback ≥ montant attendu.

**V4 — RLS permissives sur `users` exploitables avec la clé anon publique**
Migrations `20260518131902` : `users_insert_anon with check (true)` et `users_update_own` **sans restriction de colonnes** → avec la clé anon (publique par nature) : (a) insertion directe d'un profil `role='ADMIN'` ; (b) tout utilisateur authentifié peut `UPDATE users SET role='ADMIN'` via l'API REST Supabase, sans passer par l'app. Chaîne complète : profil ADMIN inséré + `verify-sms-otp` sur son propre numéro = session ADMIN.
*Reco* : `with check` colonne-par-colonne (trigger `before update` bloquant role/active_role/is_email_verified/nni…), insert anon supprimé (l'app utilise déjà le service-role), trigger `prevent_role_self_escalation`.

**V4bis — Secrets commités dans le dépôt (worklog.md tracké par git)**
`worklog.md` (fichier **suivi par git**, commité sur la branche 4.0.0) contient en clair `ONECI_API_KEY=95d5eff0-…` et `ONECI_SECRET_KEY=[REDACTÉ — rotation requise, voir docs/RUNBOOK-ROTATION-SECRETS.md]` (§ "Task ID: 3, ONECI KYC Agent"). Aussi `.env.local.example` commité avec `INTOUCH_PARTNER_ID`/`INTOUCH_LOGIN_API` réels (faible). 
*Reco* : **rotation immédiate des clés ONECI**, retrait des valeurs du fichier, purge d'historique git (BFG) si le repo est partagé, rule "pas de secrets dans les logs/worklogs".

### 🟠 MAJEUR

**V5 — OTP stockés en clair + `otp-hash.ts` mort.** `send-sms-otp`, `register`, `email-auth.createEmailOtp` insèrent `code` en clair ; le module de hashage+pepper+timing-safe n'est jamais importé. Une lecture DB (fuite/backup admin) suffit à dériver tous les OTP actifs.
*Reco* : brancher `hashOtpCode/verifyOtpCode` partout, TTL, index par (phone,type) déjà présents ✔.

**V6 — Rate-limiting incomplet sur les OTP critiques.** `verify-email-otp` (EMAIL_VERIFY **et** PASSWORD_RESET) n'a **aucun** rate-limit → brute-force 6 chiffres en ligne (10⁶ essais / 5 min d'expiration = ~3 300 req/s nécessaires, atteignable en parallèle). Pas de limite globale par IP ; `register` sans limite (SMS pumping → coûts ANSUT). Rate limiter in-memory par process (approximatif en PM2 cluster, cf. commentaire du module) et `startRateLimiterCleanup` jamais appelé.
*Reco* : rate-limit sur toutes les routes OTP/verify + login (par IP + par cible), captcha/proof-of-work sur register, appel du cleanup au boot, stockage Redis si cluster.

**V7 — Buckets de stockage sensibles publics + policies storage sans cloisonnement.** `owner-documents`, `rental-documents`, `property-documents`, `lease-documents` (forcé public pour CRYPTONEO), `maintenance-images` : `public=true` (migrations 042/20260521/20260519/20260522). Les pièces KYC (CNI, fiches de paie, titres de propriété) et baux signés sont accessibles par URL directe. De plus les policies `storage.objects` (tous buckets sauf avatars) ne filtrent **pas** par dossier : tout utilisateur authentifié peut lister/éditer/supprimer les objets des autres (`using (bucket_id='…')`).
*Reco* : buckets documents en privé + URLs signées (l'app a déjà `createSignedUploadUrl`), policies avec `storage.foldername(name)[1] = uid` (modèle avatars) ou match sur la table métier, supprimer la migration "lease-documents public" au profit d'URLs signées longues durée pour CRYPTONEO.

**V8 — Uploads : validation partielle.** Pas de Zod nulle part (0 occurrence dans `src/app/api`) — validation manuelle hétérogène. `owner-file/documents/upload-url` : extension prise du `name` client sans whitelist, pas de taille max applicative (le bucket 20 Mo limite seulement si présent), `allowed_mime_types` parfois `null` (migration 042 vs 20260521 : valeurs incohérentes selon l'ordre d'application), signed URL avec `upsert:true`. `avatar` ✔ (regex data-URL, 2 Mo) mais pas de vérification des magic bytes. Aucune route n'utilise FormData (tout est base64 JSON → ×1,33 mémoire).
*Reco* : whitelist d'extensions/MIME côté serveur, `fileSizeLimit` cohérents, validation magic bytes (ex. `file-type`), retirer `upsert`, renommer en UUID.

**V9 — Transferts d'argent sans plafond ni double validation.** Edge `payment-transfer` (paiement immédiat) : réservé ADMIN/AGENCE ✔ mais `montant` **sans maximum**, sans vérification que `payeurAlias` appartient au compte métier, sans rafale/rate-limit ; logging du résultat Intouch (parfois secret opérationnel) en DB. Un compte AGENCE compromis peut vider un wallet.
*Reco* : plafonds par transaction/jour, OTP de confirmation serveur, liste blanche d'alias payeurs, alerte fraude au-delà de seuils.

**V10 — Edge Functions non authentifiées ou à auth à surveiller.** Sans `verify_jwt` explicite (aucune config par fonction dans le repo, pas de script de deploy) : `signature-auth` (proxy CRYPTONEO public — récupération de token app-level par quiconque), `retrieve-certificates` (**liste tous les porteurs de certificats CRYPTONEO : nom, email, téléphone, n° série — PII, sans auth**), `sign-verify`, et 7 jobs cron (`expire-*`, `remind-*`, `generate-monthly-payments`, `check-overdue-payments`, `payment-callback` hors secret) invocables par n'importe qui → spam de notifications/SMS à tous les users et coût API. Les fonctions user (`sign`, `kyc-*`, `oneci-*`, `payment-initiate`, `payment-transfer`, `signed-file`, `check-certificate`) utilisent `resolveUserFromRequest` ✔ mais acceptent `Bearer SERVICE_ROLE + x-user-id` (à ne jamais exposer côté client — actuellement serveur uniquement ✔, mais toute fuite de la clé service-role devient une usurpation totale).
*Reco* : activer `verify_jwt` (ou config `[functions.<name>.verify_jwt = true]`) sur les fonctions user, mettre les crons derrière un secret partagé + allowlist d'IP/planificateur, ajouter l'auth (JWT) à `retrieve-certificates`/`signature-auth`, supprimer le motif service-role+x-user-id au profit d'un JWT court durée émis par le serveur Next.

**V11 — Middleware : contournement trivial du gating.** `request.cookies.has(SESSION_COOKIE_NAME)` — présence seulement : un cookie quelconque passe le middleware (les routes revérifient ✔), mais le blocage 401/redirect ne protège rien et le **contrôle de rôle est sauté pour les sessions custom** (le code ne s'exécute que `if (user && …)`). Toute nouvelle route sous un préfixe de rôle qui oublie la vérif en route est immédiatement exposée aux sessions SMS. Le redirect vers `/` (HTML) au lieu d'un 401 JSON casse aussi la gestion d'erreur côté fetch.
*Reco* : résoudre la session custom dans le middleware (lookup DB impossible en Edge → au minimum : cookie signé/HMAC pour valider la présence), faire la vérif de rôle même pour authSource='session', renvoyer 401 JSON pour les /api/*.

### 🟡 MINEUR / DETTES

- **V12** — `/api/users/search` : recherche par email dès 2 caractères → énumération partielle d'utilisateurs (id, noms, avatar). Limiter par relations métier.
- **V13** — Double système de mots de passe incohérent : login = Supabase Auth uniquement ; `reset-password` (SMS) et `users.password_hash` (bcrypt, utilisé par change-password) gèrent un hash jamais consulté à la connexion ; `register` SMS stocke `bcrypt('sms-<timestamp>')` aléatoire. → confusion + risque de réactivation accidentelle du hash local. Unifier sur Supabase Auth.
- **V14** — `/api/properties/[id]/inventory-reports` et `/api/stats` publics via service-role (agrégats OK mais sans cache ni rate-limit → DoS cheap sur la DB).
- **V15** — `resolveRequestUser` log les noms de cookies à chaque requête (`console.log`) ; bruit + infos en logs. Idem payloads de callbacks loggés en clair (payment-callback log tout le payload).
- **V16** — 8 routes renvoient `error.message`/`error?.message` du serveur au client (signature/*, leases/[id]/sign, rental-files action, search-alerts, properties…) → fuite potentielle de détails internes ; standardiser sur messages génériques + `console.error`.
- **V17** — Sécurité HTTP : `next.config.ts` n'a **aucun header** (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) ; Caddyfile sert en HTTP clair (`:81`) et expose un reverse-proxy générique via `?XTransformPort=` (SSRF local). CSRF largement couvert par SameSite=Lax + JSON body (aucun changement d'état en GET hors webhook à sécuriser).
- **V18** — `switch-role` : un AGENCE peut s'afficher PROPRIETAIRE (et inversement LOCATAIRE↔PROPRIETAIRE by design) — vérifier l'impact business (annonces postées par une agence déguisée).
- **V19** — Sessions custom : token stocké en clair dans `sessions.token` (hasher comme les OTP), `deleteSession` avale les erreurs, cookie glissant non répercuté en DB, aucune révocation par appareil (settings/sessions liste/supprime ✔ mais global).
- **V20** — `seed/route.ts` (demo1234, supprimé en prod ✔) et `migrate-videos` (route d'admin-outillage authentifiée mais sans contrôle de rôle explicite — à vérifier).
- **V21** — Dépendance : aucun `npm audit`/lockfile audit visible ; bcryptjs@3 ✔ ; `deno.land/std@0.177.0` daté dans les Edge Functions.

### Points positifs relevés ✔
Anti-rejeu OTP par CAS (`update … where is_used=false`), comparaisons timing-safe (HMAC callback, otp-hash), sessions custom à 96 caractères d'entropie, cookies httpOnly+SameSite, scoping systématique `owner_id/tenant_id/tc_id` dans les requêtes service-role, `authorizeTC` propre, seed bloqué en prod, mot de passe ≥8 complexe, bcrypt coût 12, `server-only` sur admin.ts/otp-hash.ts, RLS présentes sur ~56 migrations (couverture large côté tables métier), messages d'erreur d'auth génériques (« Email ou mot de passe incorrect »).

---

## 5. RECOMMANDATIONS PRIORISÉES

1. **Immédiat (jour 0)** — V1 whitelist rôle à l'inscription ; V2 supprimer le fallback `getSession()` ; V4bis rotation clés ONECI + purge worklog ; V3 fail-closed webhook (secret obligatoire, GET désactivé).
2. **Semaine 1** — V4 policies RLS users (trigger anti-escalade) ; V7 buckets privés + policies storage par dossier + URLs signées ; V5 hasher les OTP (brancher otp-hash.ts) ; V6 rate-limit sur verify-email-otp/login/register.
3. **Semaine 2-3** — V10 verify_jwt/secret sur Edge Functions (crons + retrieve-certificates + signature-auth) ; V8 validation d'uploads serveur (magic bytes, extensions, tailles) ; V9 plafonds paiement immédiat ; V11 middleware : 401 JSON + validation cookie + rôle pour sessions custom.
4. **Continu** — introduire Zod (ou un helper de validation commun) sur les routes mutantes ; headers de sécurité (CSP/HSTS) + HTTPS via Caddy ; unifier le système de mot de passe (V13) ; audit CI (tsc sans cache, eslint, grep secrets, npm audit).

---

## 6. CONCLUSION

Le backend est fonctionnellement riche (162 routes, 27 Edge Functions, migrations RLS complètes) et montre de vraies bonnes pratiques ponctuelles (anti-rejeu, timing-safe, scoping). Mais **toute la sécurité repose sur le code applicatif** car le service-role contourne la RLS partout, et 5 failles critiques (auto-attribution de rôle, fallback getSession forgeable, webhook fail-open, RLS users permissive, secrets commités) permettraient aujourd'hui à un attaquant d'obtenir des privilèges ADMIN ou de valider des paiements fictifs. Les correctifs P0 listés ci-dessus sont localisés, peu coûteux, et doivent précéder toute exposition publique.
