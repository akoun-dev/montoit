# Analyse DONNÉES / SUPABASE — Mon Toit CI

**Task ID:** 1-e · **Agent:** DEV FULLSTACK/DATA (Explore) · **Branche:** 4.0.0 (commit d206a4b) · **Mode:** lecture seule, aucun code modifié

---

## 0. Synthèse express

| Axe | Constat |
|---|---|
| Tables Postgres (migrations) | **51 tables** créées dans `supabase/migrations/` (85 fichiers SQL) |
| Types générés (`src/lib/supabase/types.ts`) | **Hand-written, 20 tables seulement** — désynchronisé de ~31 tables et de nombreuses colonnes |
| Edge Functions | **26 dossiers** (+ `_shared` de 8 modules) — 3 387 lignes TS Deno |
| RLS | Activée sur ~49 tables, **247 policies** ; corrigée a posteriori (migration 20260911000003) |
| Client `service_role` côté Next.js | **147 fichiers de routes API** (387 occurrences de `getSupabaseAdminClient`) → RLS contournée par design |
| Realtime | Publication DB = 13 tables ; app écoute **26 tables** → **15 tables écoutées mais hors publication** (temps réel mort) |
| Storage | **11 buckets**, quasi tous `public=true` en base, dont baux signés et documents justificatifs |
| Migrations | Oui, schéma versionné dans le repo (pas de schéma cloud-only) ; `seed.sql` référencé dans config.toml mais absent |

---

## 1. Dictionnaire de données

### 1.1 Modèle de types (`src/lib/supabase/types.ts` — 703 lignes)

Structure `Database { public: { Tables: { x: { Row / Insert / Update } }, Views, Functions, Enums, CompositeTypes } }`. Le format imite les types générés Supabase mais est **écrit à la main** : `Relationships: []` partout (aucune relation typée), `Update = Partial<Insert>` systématique.

**Tables couvertes (20)** : `users`, `otp_codes`, `favorites`, `notifications`, `notification_preferences`, `properties`, `property_images`, `property_documents`, `conversations`, `messages`, `visit_requests`, `rental_files`, `rental_file_documents`, `owner_files`, `owner_file_documents`, `audit_logs`, `leases`, `ratings`, `mandats`, `payments`.

**Écarts majeurs avec le schéma réel (migrations)** :
- Tables absentes : `applications`, `disputes`, `maintenance_requests`, `maintenance_comments`, `inventory_reports`, `inventory_report_items`, `missions`, `agency_agents`, `agency_agent_properties`, `verification_agents`, `certifications`, `fraud_alerts`, `validation_slas`, `agent_feedback`, `sessions`, `connection_logs`, `platform_settings`, `signature_aliases`, `facial_verifications`, `oneci_verifications`, `ownership_documents`, `signalements`, `service_usage_logs`, `message_attachments`, `search_alerts`, `default_conditions`, `backups`, `commissions`, `payment_attempts`, `deposit_refunds` (~30).
- Colonnes absentes sur des tables présentes : `payments.amount_paid`, `payments.reminder_3d_sent_at/reminder_1d_sent_at` ; `leases.contract_url`, `cryptoneo_operation_id`, `reminder_sent_at`, `renewal_reminder_sent_at` ; `properties.listing_expires_at` + colonnes features (20260529000000) ; `visit_requests.assigned_agent_id/reminder_sent_at` ; `property_documents.is_published` (présent, ok)…
- Enums Postgres (36 types) aplatis en `string` ; seuls `user_role` et `otp_type` sont mappés en unions TS.

### 1.2 Tables principales & champs clés (source : migrations)

**Identité & sécurité**
- **users** (id `text` PK — miroir applicatif de Supabase auth.users, mais table autonome) : `email` unique, `phone` unique, **`password_hash`**, `role`/`active_role` (enum user_role : LOCATAIRE, PROPRIETAIRE, AGENCE, ADMIN, TIERS_CONFIANCE), KYC : `nni`, `neoface_verified(_at)`, `oneci_verified(_at)`, `kyc_document_id`, `birth_date`, `gender` ; préférences `show_phone/show_email`, `two_factor_enabled`. RLS : select/update own, **insert anon `with check (true)`**.
- **otp_codes** : `code` (hashé SHA-256 côté app, cf. `src/lib/otp-hash.ts` avec pepper `OTP_HASH_PEPPER`), `type` (otp_type étendu : LOGIN, EMAIL_VERIFY, PASSWORD_RESET, BAIL_SIGNATURE, PHONE_VERIFY, EMAIL_CHANGE, PHONE_CHANGE), `expires_at`, `is_used`, `user_id` FK.
- **sessions** : `token`, `user_id`, `expires_at` — sessions custom SMS-OTP (cookie httpOnly `SESSION_COOKIE_NAME`).
- **connection_logs**, **audit_logs** (action/entity/entity_id/details), **platform_settings**.
- **signature_aliases** : `alias_certificat` unique, `first_name/last_name/gender/email/phone/organisation/type_piece/hash_piece/certificate_data`, `is_active`, `user_id` **unique** FK users (1 certificat CRYPTONEO par utilisateur).

**Biens & catalogues**
- **properties** : `title`, `description`, `type`, `status` (property_status : DRAFT→PENDING_VERIFICATION→ACTIVE→SUSPENDED/CLOSED/RENTED), `rental_status` (disponible/loue/reserve), `price/currency/area/bedrooms/bathrooms`, géo (`latitude/longitude/commune/city/address`), équipements booléens, `amenities`/`rental_terms` (texte), `views_count`, `hide_owner_name`, `is_verified`, **`listing_expires_at`** (trigger 90 j, migration 20260910000013) → `owner_id` FK users.
- **property_images** (url, order), **property_documents** (type, url, expiry_date, `is_published`), bucket property-videos.

**Parcours locatif**
- **visit_requests** : visit_type (PHYSICAL/VIRTUAL), requested_date, time_slot, status (PENDING/ACCEPTED/REJECTED/COUNTER_PROPOSED/COMPLETED/CANCELLED), counter_date/time_slot, `assigned_agent_id` → **agency_agents** (FK repointée par migration 20260911000000, l'ancienne FK vers users violait systématiquement), `reminder_sent_at`.
- **rental_files** (dossier locatif) : status (rental_file_status : DRAFT→SUBMITTED→TC_REVIEW→VALIDATED→ACCEPTED/REJECTED/EXPIRED), `priority`, `on_hold(_reason)`, `tenant_category`, `monthly_income`, `employer`, `employment_type`, garant (name/phone/relation), **`valid_until`** (expiration cron), `reviewed_by_id` → tenant_id FK. **rental_file_documents** (type document_status PENDING/VALIDATED/REJECTED, tc_comment).
- **applications** (candidatures) → rental_file_id, contrainte d'unicité par migration 20260617000000 ; RLS dédiée (20260618000000).
- **owner_files / owner_file_documents** : miroir côté propriétaire (statuts, reviewed_by_id).
- **leases** : status (lease_status + CANCELLED ajouté 20260910000004), start/end_date, monthly_rent/charges/deposit, **signature intégrée** : owner/tenant_signed_at, `owner_sign_otp`/`tenant_sign_otp` (**OTP en clair**), signature_image ; renouvellement (renewal_status/notes/renewed_lease_id, renewal_reminder_sent_at) ; `contract_url`, `cryptoneo_operation_id` ; FK property_id/tenant_id/owner_id/rental_file_id (cascade).
- **mandats** : type (GESTION_COMPLETE/GESTION_LOCATION/MANDAT_SIMPLE), commission_rate/type/fixed_commission, owner_signed_at/agency_signed_at + colonnes signature (20260910000001), terminaison ; FK property/owner/agency.
- **inventory_reports / inventory_report_items** : état des lieux (INVENTORY_ENTRANCE/EXIT, statuts SIGNED_*), room_condition BON/MAUVAIS.
- **deposit_refunds** (20260910000011) : deposit_amount, refund_amount, deductions, status PENDING/DECIDED/PAID, `lease_id` **unique**.

**Argent**
- **payments** : `amount real`, **`amount_paid real`** (partial payments, 20260910000010), status payment_status (PENDING/PROCESSING/PAID/PARTIAL/LATE/CANCELLED), due_date, paid_at, reference (CAUTION-/AVANCE-/AGENCE-…), method payment_method (ORANGE_MONEY/MTN_MOMO/MOOV_MONEY/WAVE), `operator_transaction_id`, `payment_operator_data jsonb` (payload brut Intouch), reminders J-3/J-1 ; FK lease_id/tenant_id. **Index unique partiel** `(lease_id, due_date) WHERE reference IS NULL` (idempotence des paiements récurrents, 20260910000003).
- **payment_attempts** : amount, method, operator_transaction_id, partner_transaction_id (`MT-<ts>-<rand>`), status PROCESSING/SUCCESS/FAILED, failure_reason.
- **commissions** (agence), **backups** (admin, storage bucket).

**Communication & confiance**
- **conversations** (participant1_id/participant2_id, property_id nullable), **messages** (conversation_id, sender_id, is_read), **message_attachments** (bucket dédié).
- **notifications** (type notification_type 19 valeurs, action_url, entity_id) + **notification_preferences** (messages, dossier_updates, visit_reminders, payment_alerts, promotions).
- **ratings** (score, comment, reply/replied_at, lease_id, from_user_id, to_user_id, property_id nullable), modération (20260910000014).
- **disputes**, **fraud_alerts**, **signalements**, **maintenance_requests/comments** (maintenance_status/priority), **search_alerts**, **default_conditions**.

**Tiers de confiance & agences**
- **verification_agents** (comptes TC « sans compte plateforme »), **missions** (PROPERTY_VERIFICATION/INVENTORY_REPORT, mission_status), **certifications** (USER_IDENTITY/PROPERTY/AGENCY, GRANTED/REVOKED/EXPIRED, cible validée par 20260910000007), **validation_slas** (entity_type RENTAL_FILE/OWNER_PROFILE/AGENCY, validé 20260910000008), **agent_feedback**, **agency_agents** (role ADMIN/AGENT/READ_ONLY, **pas de compte users**), **agency_agent_properties** (sécurisée 20260910000002), **ownership_documents** (TITRE_FONCIER/ACTE_NOTARIE/…, liés à property via 20260910000006).

**KYC / journaux techniques**
- **facial_verifications** : provider (neoface), `document_id`, `selfie_url`, status pending/passed/failed, matching_score, is_match/is_live, `provider_response jsonb` ; FK user_id (text) cascade.
- **oneci_verifications** (20260911000002) : method MATCH/FACE_AUTH/FINGERPRINT_AUTH/MANUAL_TC, status PASSED/FAILED, score, provider_response jsonb — historise chaque tentative (miroir de facial_verifications).
- **service_usage_logs** : service_name, provider, status, response_time_ms, `metadata jsonb` ; `user_id` **retypé uuid→text** + FK ajoutée par 20260911000003.

### 1.3 Enums (36 types, migration 000)
`user_role, otp_type, property_type, property_status, rental_status, rental_file_status, employment_type, tenant_category, document_type, document_status, ownership_doc_type, visit_type, visit_request_status, lease_status, dispute_type, dispute_status, fraud_alert_status, validation_sla_entity_type, payment_status, payment_method, maintenance_status, maintenance_priority, notification_type, inventory_type, inventory_status, room_condition, mission_status, mission_type, dossier_priority, certification_type, certification_status, property_doc_type, mandat_status, mandat_type, agency_agent_role, agency_agent_status, commission_status, signalement_status, signalement_reason` — extensions : otp_type (+3 valeurs, 20260618000001), lease_status (+CANCELLED, 20260910000004).

### 1.4 Intégrité
- **FK réelles** déclarées dans les migrations (users ↔ tout, cascade majoritaire), mais `types.ts` ne les expose pas (`Relationships: []`).
- IDs `text` (UUID générés côté app via `crypto.randomUUID()`, rarement `default gen_random_uuid()` — sauf tables techniques).
- **Dénormalisations** : `leases.monthly_rent` copié dans `payments.amount` ; `properties.rental_status` synchronisé par trigger (20260910000005) ; `users.first_name/last_name/gender/birth_date/nni` écrasés par l'OCR NeoFace.
- **JSONB** : `payment_operator_data`, `provider_response` (x2), `service_usage_logs.metadata`, `details` audit.
- **Argent en `real`** (float32) et non `numeric` → risque d'arrondi sur FCFA (mitigé par tolérance 0.01 dans le callback).
- updated_at par triggers partagés `update_updated_at_column()` (défini dans la migration users) — sauf `payment_attempts`, `oneci_verifications`.
- Date de péremption des dossiers `valid_until` gérée côté cron (lazy par défaut).

---

## 2. Edge Functions — inventaire complet (26)

Partagé `_shared/` : `cors.ts` (whitelist 127.0.0.1:3000 / localhost:3000 / mon-toit.ci — fallback silencieux sur la 1ʳᵉ origine), `supabase-admin.ts` (singleton service_role), `auth.ts` (`resolveUserFromRequest` : JWT Supabase OU **service_role + header `x-user-id`**), `intouch.ts`, `cryptoneo.ts`, `oneci.ts` (→ **RNPP Connect**), `ansut-messaging.ts`, `notify.ts`.

### 2.1 Paiements (INTOUCH / Gutouch)
| Fonction | But | API externe | Secrets | Notes/Risques |
|---|---|---|---|---|
| **payment-initiate** | Initie un PAIEMENT mobile money (validation rôle LOCATAIRE/tenant, statut PENDING/LATE/PARTIAL, montant ≤ restant) | Intouch `PUT touchpayapi/ANSUT13287/transaction` | INTOUCH_* (Basic Auth + loginAgent/passwordAgent en query) | payments→PROCESSING, insert `payment_attempts`, notify ; renvoie `redirectUrl` (Wave) |
| **payment-callback** | Webhook Intouch POST/GET : success/failure/unknown | Intouch (callback entrant) | `INTOUCH_CALLBACK_SECRET` (optionnel !) | Idempotence : attempt PROCESSING + CAS `.not status in PAID/CANCELLED` ; PARTIAL ; auto-génère le loyer du mois suivant (23505 avalée) ; notif locataire+propriétaire |
| **payment-transfer** | Paiement Immédiat entre wallets Intouch (réservé ADMIN/AGENCE) | `POST businessapi.gutouch.com/paiements-immediats` | INTOUCH_* | Journalise dans `service_usage_logs` |
| **generate-monthly-payments** | Cron : crée les loyers PENDING du 5 du mois suivant pour baux ACTIVE | — | `CRON_SECRET` | Doublon évité par check + index unique partiel |
| **check-overdue-payments** | Cron : PENDING → LATE atomique + notifications | — | `CRON_SECRET` | Claim atomique (update…select) |

### 2.2 Signature électronique (CRYPTONEO / ANSUT e-signature)
| Fonction | But | API externe | Auth | Risques |
|---|---|---|---|---|
| **signature-auth** | Retourne le token JWT CRYPTONEO (cache 30 min) | `/user/auth` | ❌ **aucune** | N'importe qui obtient un token d'API CRYPTONEO |
| **generate-certificate** | Vérifie alias local, sync depuis `/generateCert/users`, sinon `/generateCert/generateCertificat`, enregistre `signature_aliases` | CRYPTONEO | ✅ JWT | Consent=true posé côté serveur |
| **sign-send-otp** | Envoi OTP signature via canal MAIL/SMS, auto-génère le certificat si absent | `/otp/send` | ✅ JWT | **Résolution de la cible par email/phone fourni → peut déclencher l'OTP d'un autre utilisateur** ; supprime les « faux alias locaux » |
| **sign** | Signature batch `signFileBatch` avec OTP, polling `verifySignedBatch` (15×2 s), téléchargement `getSignedFile`, upload Storage `lease-documents/signed/` | CRYPTONEO | ✅ JWT | Image de signature par défaut hardcodée ; bucket public |
| **sign-verify** | Vérifie operationId + récupère/upload le fichier signé | CRYPTONEO | ❌ **aucune** | Upload Storage déclenchable sans auth |
| **signed-file** | Stream du PDF signé | CRYPTONEO | ✅ JWT | — |
| **check-certificate** | Sync alias CRYPTONEO → DB | CRYPTONEO | ✅ JWT | — |
| **retrieve-certificates** | Liste tous les certificats CRYPTONEO (filtres alias/email/phone/nom/state) | CRYPTONEO | ❌ **aucune** | **Fuite de données personnelles des signataires** (nom, email, phone, serial certificat) |

### 2.3 KYC (NeoFace + ONECI via RNPP Connect)
| Fonction | But | API externe | Secrets |
|---|---|---|---|
| **kyc-face-auth** (471 l.) | modes upload/verify/reset : `/document_capture` (OCR CNI : écrase first_name/last_name/gender/birth_date/**nni** dans users), `/match_verify` (selfie↔doc) → `facial_verifications` + `users.neoface_verified` | NeoFace (aineo.ai) v2 | NEOFACE_API_BASE, NEOFACE_BEARER_TOKEN ; journalise `service_usage_logs` |
| **oneci-match** | Match identitaire NNI + état civil → `oneci_verifications`, flag `users.oneci_verified` | RNPP Connect `/rnpp/persons/{nni}/match` | RNPP_API_BASE, RNPP_API_KEY (X-Api-Key) |
| **oneci-face-auth** | Biométrie visage (payload ≤ 2 Mo) | `/rnpp/face-auth` | idem |
| **oneci-fingerprint-auth** | Biométrie empreinte (≤ 1 Mo) | `/rnpp/fingerprint-auth` | idem |
| **oneci-person** | Consultation personne par NNI (GET) | `/rnpp/persons/{nni}` | idem |
| **oneci-subscription** | Solde/quota RNPP (ADMIN only) | `/billing/balance` | idem |

⚠️ Les fonctions « oneci-* » **n'appellent pas ONECI directement** mais le service **RNPP Connect** (`kyc.rnpp-connect.ci`) — la nomenclature est trompeuse.

### 2.4 Rappels / maintenance (cron, tous `CRON_SECRET`, claim atomique, `notify()`)
- **remind-lease-expiring** (J-60 avant end_date, une fois, via `renewal_reminder_sent_at`)
- **remind-pending-lease-signatures** (48 h, répété, via `reminder_sent_at`)
- **remind-upcoming-payments** (J-3/J-1, respecte `notification_preferences.payment_alerts`)
- **remind-upcoming-visits** (J-1, respecte `visit_reminders` ; agents d'agence sans compte → **ANSUT SMS/Email**)
- **expire-stale-listings** (ACTIVE + listing_expires_at dépassé → SUSPENDED, notif owner)
- **expire-stale-rental-files** (VALIDATED + valid_until → EXPIRED, applications non finalisées → EXPIRED)

### 2.5 Divers
- **_test** : hello-world avec `Access-Control-Allow-Origin: *` (reliquat de dev à supprimer).

**Secrets requis (edge)** : SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (injection auto), INTOUCH_BASE_URL/USERNAME/PASSWORD/PARTNER_ID (`CI3003…` hardcodé par défaut)/LOGIN_API (`070845…`)/API_PASSWORD/CALLBACK_URL/CALLBACK_SECRET/PAIEMENT_IMMEDIAT_URL/WAVE_RETURN_URL/WAVE_CANCEL_URL/PUBLIC_APP_URL, CRYPTONEO_API_URL/APP_KEY/APP_SECRET, RNPP_API_BASE/RNPP_API_KEY, NEOFACE_API_BASE/NEOFACE_BEARER_TOKEN, ANSUT_API_BASE_URL/USERNAME/PASSWORD/SMS_SENDER, CRON_SECRET. Côté Next : + `AZURE_OPENAI_*` (chatbot SUTA, `/api/suta`), `OTP_HASH_PEPPER`.

---

## 3. Migrations

- **85 fichiers SQL** dans `supabase/migrations/`, du 20260518131900 (enums) au 20260911000004 (property_documents RLS). Convention `YYYYMMDDHHMMSS_nom`. ⚠️ Les dates sont dans le futur (2026) — artificielles, mais cohérentes et ordonnées.
- **Le schéma est donc versionné dans le repo** (pas de risque « schéma cloud-only ») ; `db:push` est un no-op (« DB externe Supabase ») et aucune commande `supabase gen types` n'existe dans package.json.
- Colonnes triggers/helpers : `update_updated_at_column()` défini dans 002_users.
- Idempotence partielle (`if not exists`, `on conflict do nothing`), correctifs post-livraison documentés dans les commentaires (RLS KYC, FK visit_requests→agency_agents, idempotence paiements, etc.).
- **Incohérences résiduelles** : `supabase/seed.sql` référencé par `[db.seed]` dans config.toml mais **absent** ; `db/custom.db` (SQLite Prisma historique) toujours présent alors que Prisma a été retiré.

## 4. supabase/config.toml (local)
`project_id = montoit` · Postgres **17** · API 54321 / DB 54322 / Studio 54323 / Inbucket 54324 · `max_rows = 1000` · storage 50 MiB par défaut · realtime activé · auth : signup email activé, **confirmations email désactivées**, SMS Twilio désactivé (OTP géré applicativement), jwt 3600 s, refresh rotation · edge_runtime Deno 2 `per_worker` · seed activé (mais fichier manquant).

---

## 5. Realtime

**Publication `supabase_realtime` (migrations, 13 tables)** : payments, leases, maintenance_requests, applications, rental_files, agency_agents, agency_agent_properties, mandats, notifications, messages, visit_requests, inventory_reports, owner_files.

**Côté app : 27 hooks/canaux `postgres_changes`** (`src/hooks/use-realtime-*.ts`, `notification-store.ts`, `notification-toast-provider.tsx`) écoutant **26 tables** : notifications, leases, payments, messages, visits, rental_files, owner_files (+ owner_file_documents), applications, inventory_reports, maintenance_requests, mandats, properties, users, ratings, disputes, fraud_alerts, certifications, signalements, validation_slas, verification_agents, missions, facial_verifications, property_documents, ownership_documents, backups.

⚠️ **15 tables écoutées ne sont pas dans la publication** : fraud_alerts, signalements, ratings, disputes, certifications, validation_slas, verification_agents, missions, facial_verifications, property_documents, ownership_documents, owner_file_documents, backups, users, properties → ces hooks ne recevront **aucun événement** en production hébergée (silencieux en local si publication auto).

---

## 6. Storage

Buckets (migrations) + constante `BUCKETS` (`src/lib/supabase/storage.ts`) :

| Bucket | Usage | Public (DB) | Limite |
|---|---|---|---|
| avatars | avatars `/uid/...` | ✅ public | 2 Mo |
| property-images | photos de biens | ✅ public | 5–10 Mo |
| property-videos | visites virtuelles vidéo | ✅ public | 50 Mo |
| property-documents | diagnostics, titres | ✅ **public** | 20 Mo |
| owner-documents | justificatifs propriétaires | ✅ **public** | 20 Mo |
| rental-documents | justificatifs locataires (KYC dossier) | ✅ **public** | 20 Mo |
| maintenance-images | photos sinistres | ✅ public | 10 Mo |
| lease-documents | **baux signés CRYPTONEO** (`signed/`) | ✅ **public volontairement** (CRYPTONEO doit télécharger l'URL, migration 20260522000001) | 20 Mo |
| mandat-documents | mandats (PDF/HTML pour conversion) | ✅ **public** | 50 Mo |
| message-attachments | pièces jointes messages | privé (créé lazily, `PUBLIC_BUCKETS` sans lui) | 50 Mo |
| backups | dumps admin | privé (remove via admin client) | 50 Mo |

Uploads : `uploadFromBase64` via **service_role** (bypass policies storage) + `getPublicUrl` ; le client envoie des base64 aux API routes. Policies storage multiples redondantes/contradictoires (2 jeux de policies par bucket, dont un « select to authenticated » sans filtre utilisateur). Les selfies KYC restent chez NeoFace (`selfie_url` externe).

---

## 7. Flux de données critiques (séquencés)

### 7.1 Paiement mobile money (INTOUCH)
1. Locataire → `POST /api/payments/initiate` (proxy Next) → **payment-initiate** EF (JWT ou service_role+x-user-id pour sessions SMS).
2. EF valide rôle/phone/montant-remaining, appelle Intouch `PAIEMENT` (service codes ORANGE_MONEY/MTN_MOMO/MOOV_MONEY/WAVE, callback signé `?token=INTOUCH_CALLBACK_SECRET`), persiste payments (PROCESSING, operator_transaction_id, payment_operator_data jsonb) + payment_attempts (PROCESSING), notifie.
3. Intouch → **payment-callback** EF (POST ou GET, secret optionnel) : lookup par transactionId/id/partner_transaction_id → idempotence (attempt ≠ PROCESSING → no-op ; CAS update `.not in (PAID,CANCELLED)`) → PAID ou PARTIAL (amount_paid), paid_at, notifications locataire/propriétaire, **auto-génération du loyer du mois suivant** (sauf CAUTION-/AVANCE-, garde 23505).
4. Crons : generate-monthly-payments (5 du mois), check-overdue-payments (PENDING→LATE), remind-upcoming-payments (J-3/J-1).
5. Résiliation de paiement échoué → revert PENDING/PARTIAL + attempt FAILED + notif.

### 7.2 Signature électronique (CRYPTONEO)
1. `generate-certificate` : alias local ? sinon recherche `/generateCert/users` (email/phone) puis génération (consent serveur) → `signature_aliases` (1 user = 1 alias, unique).
2. `sign-send-otp` : résout la cible (self/email/phone — ⚠️ peut cibler un autre utilisateur), priorise l'alias confirmé CRYPTONEO, auto-génère si besoin, envoie OTP `/otp/send` (MAIL/SMS).
3. `sign` : batch docs (`signFileBatch`, OTP, callBackUrl partenaire) → operationId → polling `verifySignedBatch` → `getSignedFile` → **upload Storage lease-documents/signed/ (URL publique)** → renvoyée comme `contractUrl` (persistance côté API routes leases/mandats + `leases.cryptoneo_operation_id`).
4. `sign-verify` (callback/vérification) et `signed-file` (téléchargement).
5. En parallèle, une signature « interne » existe : OTP `otp_codes` hashés (type BAIL_SIGNATURE) + champs `leases.owner_sign_otp/tenant_sign_otp` (**en clair**) + image de signature (signature-pad).

### 7.3 OTP SMS / sessions (ANSUT)
1. `POST /api/auth/send-sms-otp` → ANSUT `SendSMS` (`src/lib/ansut-messaging.ts`, format +225…) → code **hashé SHA-256** (pepper OTP_HASH_PEPPER ou service_role) dans `otp_codes`.
2. Vérification timing-safe → création session custom (`sessions.token`, cookie httpOnly, expiration glissante) ; `resolveRequestUser` : d'abord Supabase JWT, fallback cookie session (lookup admin).
3. Pour les Edge Functions, les sessions SMS n'ont pas de JWT → fallback **service_role comme Bearer + header x-user-id** ( cf. `get-edge-function-bearer-token.ts`).
4. Emails OTP : `/api/auth/send-email-otp` (ANSUT `message/send`).

### 7.4 KYC (NeoFace + ONECI/RNPP)
1. **NeoFace** : upload recto/verso base64 → `/document_capture` → document_id + OCR → `facial_verifications` (pending) + OCR écrase le profil users (nom, prénom, sexe, naissance, NNI verso) → selfie → `/match_verify` (polling) → verified/failed → `users.neoface_verified`, reset possible (mode reset).
2. **ONECI (RNPP Connect)** : `oneci-match` (NNI + état civil) / `oneci-face-auth` (photo base64 ≤2 Mo) / `oneci-fingerprint-auth` → `oneci_verifications` (historique complet) + `users.oneci_verified/nni`.
3. Journaux d'appels providers → `service_usage_logs` (retry/429 gérés avec Retry-After).
4. Le TC peut consulter les vérifications (RLS) ; ADMIN voit le solde RNPP (`oneci-subscription`).

---

## 8. Risques data (priorisés)

| # | Sévérité | Risque |
|---|---|---|
| 1 | 🔴 Critique | **`types.ts` obsolète** : 20/51 tables, colonnes manquantes (amount_paid, contract_url, listing_expires_at…), aucune relation typée, aucun script `supabase gen types`. Drift TS/DB garanti, risque d'erreurs runtime silencieuses (`.select('amount_paid')` non typé etc.). |
| 2 | 🔴 Critique | **Service_role massivement utilisé côté app** : 147 fichiers API routes / 387 usages de `getSupabaseAdminClient` → RLS contournée systématiquement ; l'autorisation repose à 100 % sur le code applicatif (`resolveRequestUser` + filtres manuels). Une seule omission = fuite inter-tenants. |
| 3 | 🔴 Critique | **Buckets publics pour documents sensibles** : rental-documents, owner-documents, property-documents, mandat-documents, lease-documents (volontaire, pour CRYPTONEO) → baux signés et justificatifs d'identité/revenus accessibles à toute personne ayant l'URL (énumérable partiellement). Remplacer par signed URLs / rôle CRYPTONEO dédié. |
| 4 | 🟠 Majeur | **Edge functions sans authentification** : `signature-auth` (distribue un token CRYPTONEO), `retrieve-certificates` (annuaire des certificats : noms/emails/téléphones), `sign-verify` (upload déclenchable). À protéger par JWT/secret partagé. |
| 5 | 🟠 Majeur | **RLS `users_insert_anon` with check (true)** : n'importe quelle requête anon (clé publique) peut insérer une ligne users avec `role='ADMIN'` et un password_hash arbitraire. Il faut contraindre role sur insert. |
| 6 | 🟠 Majeur | **Callback Intouch à secret optionnel** : sans `INTOUCH_CALLBACK_SECRET`, le webhook est ouvert → falsification de confirmation de paiement possible. De plus la signature est un simple token en query string, et le statut est déduit de chaînes libres. |
| 7 | 🟠 Majeur | **Realtime partiellement inopérant** : 15 tables écoutées absentes de la publication `supabase_realtime` (fraud_alerts, ratings, disputes, users, properties…). UX temps réel cassée en prod, silencieusement. |
| 8 | 🟠 Majeur | `sign-send-otp` : envoi d'OTP signature pour le compte d'un autre utilisateur (param email/phone) + génération de certificat implicite → harcèlement/spam SMS possible ; `leases.owner_sign_otp/tenant_sign_otp` stockent l'OTP **en clair**. |
| 9 | 🟡 Significatif | Montants en `real` (float) ; pas de contrainte CHECK montant>0 sur payments ; `payment_attempts` sans FK unique sur operator_transaction_id (lookups `maybeSingle` ⇒ risque de doublon si deux initiations). |
| 10 | 🟡 Significatif | Policies storage en double jeu (dont policies « authenticated » sans ownership) ; `ensureBucketExists` en runtime (DDL via service_role à chaque upload). |
| 11 | 🟡 Significatif | Fonctions « oneci-* » → en réalité RNPP Connect : nomenclature trompeuse, et `oneci-person` expose la consultation RNPP d'un NNI quelconque à tout utilisateur authentifié. |
| 12 | 🟡 Significatif | `service_usage_logs`/`facial_verifications` : politiques « USING (true) » historiques corrigées seulement en 20260911000003 ; vérifier sur le cloud que la migration a bien été appliquée. Dénormalisation OCR du profil user (perte de contrôle consentement). |
| 13 | 🟡 Significatif | Hygiène : `_test` (CORS *) à supprimer ; `db/custom.db` héritage Prisma ; `seed.sql` manquant vs config.toml ; CORS edge en fallback silencieux ; dates de migrations en 2026 (ordre fragile si l'horloge réelle les rattrape). |
| 14 | 🟢 Point positif | OTP hashés + timing-safe ; idempotence paiements soignée (CAS + index unique partiel + attempts) ; claims atomiques dans tous les crons ; RLS présente et largement correcte sur les tables métier ; historisation KYC complète (facial + oneci_verifications). |

---

## 9. Recommandations (prochaines actions)

1. **Régénérer `types.ts`** (`supabase gen types typescript --linked`) et l'intégrer au CI ; corriger les imports `any`.
2. Réduire la surface service_role : policies RLS utilisables avec le client SSR (`createRouteHandlerSupabaseClient`) pour les routes mono-tenant, garder service_role pour les opérations admin réelles.
3. Passer les buckets documentaires en privés + signed URLs (sauf catalogue : property-images/videos, avatars) ; négocier avec CRYPTONEO un téléchargement authentifié.
4. Ajouter auth (JWT ou secret) sur signature-auth / retrieve-certificates / sign-verify ; supprimer `_test` ; rendre `INTOUCH_CALLBACK_SECRET` obligatoire.
5. Corriger `users_insert_anon` (role forcé LOCATAIRE), uniformiser money en `numeric(12,2)`, index unique sur `payment_attempts.operator_transaction_id`.
6. Compléter la publication realtime avec les 15 tables manquantes (ou retirer les hooks morts).
7. Renommer/clarifier la couche ONECI→RNPP et restreindre `oneci-person` (ADMIN/TC uniquement).
