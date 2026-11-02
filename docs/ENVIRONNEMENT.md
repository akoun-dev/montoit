# Variables d'environnement — Mon Toit CI

Inventaire de référence des variables lues par le code (application Next.js, Edge Functions Supabase, scripts). Le fichier `.env.local.example` est le gabarit à copier vers `.env.local`.

**Légende** : 🔴 critique (l'application ou le service est dégradé sans elle) · 🟠 requis en production (fonctionne en dev sans, mais ouvre une faille ou une indisponibilité en prod) · 🟢 optionnel (défaut dans le code).

**Où renseigner** :
- **Next.js** → `.env.local` (local) / variables d'environnement de l'hôte (production).
- **Edge Functions** → Dashboard Supabase → *Edge Functions → Secrets* (variables marquées « EF » dans la note de section).
- Les variables `NEXT_PUBLIC_*` sont **exposées au navigateur** : jamais de secret dedans.

## Supabase

| Variable | Service | Niveau | Rôle & où l'obtenir |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | 🔴 | URL du projet — Dashboard Supabase → Project Settings → API. Client navigateur + serveur. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | 🔴 | Clé publique `anon` (protégée par les RLS) — même écran. |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | 🔴 | Clé `service_role` (accès total, contournement RLS) — **serveur uniquement**, même écran. Sert aussi de pepper OTP par défaut si `OTP_HASH_PEPPER` est absent. |
| `OTP_HASH_PEPPER` | App (sécurité) | 🟠 | Pepper du hash des OTP (`src/lib/otp-hash.ts`). Recommandé en production : chaîne aléatoire longue, uniquement côté serveur. |

## Application

| Variable | Service | Niveau | Rôle & où l'obtenir |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | App | 🔴 | URL publique de l'app (callbacks paiement, appels API internes, Edge Functions). Définie par vous (ex. `https://mon-toit.ansut.ci`). |
| `NEXT_PUBLIC_CAPACITOR_API_URL` | App (mobile) | 🟢 | URL d'API dédiée pour le bundle mobile Capacitor (`src/lib/capacitor.ts`). |
| `OTP_EXPIRY_MINUTES` | App (auth) | 🟢 | Durée de vie des OTP en minutes (défaut : 5). |

## Paiements — Intouch (Next.js + EF)

| Variable | Service | Niveau | Rôle & où l'obtenir |
|---|---|---|---|
| `INTOUCH_BASE_URL` | Intouch | 🔴 | Point d'entrée API distributrice (défaut : `https://apidist.gutouch.net/apidist/sec/`). Fourni par Intouch. |
| `INTOUCH_USERNAME` | Intouch | 🔴 | Identifiant du compte marchand — contrat Intouch. |
| `INTOUCH_PASSWORD` | Intouch | 🔴 | Mot de passe du compte marchand. |
| `INTOUCH_PARTNER_ID` | Intouch | 🔴 | ID partenaire (défaut du code : `CI300373`). |
| `INTOUCH_LOGIN_API` | Intouch | 🔴 | Login API (défaut du code : `07084598370`). |
| `INTOUCH_API_PASSWORD` | Intouch | 🔴 | Mot de passe API (cashin). |
| `INTOUCH_CALLBACK_URL` | Intouch | 🔴 | URL webhook de confirmation de paiement (vers `/api/payments/callback`). |
| `INTOUCH_CALLBACK_SECRET` | Intouch | 🟠 | Secret partagé du callback côté Intouch. |
| `INTOUCH_PAIEMENT_IMMEDIAT_URL` | Intouch | 🔴 | API paiement immédiat/anticipé (défaut : `https://businessapi.gutouch.com/paiements-immediats`). |
| `INTOUCH_WAVE_RETURN_URL` | Intouch (Wave) | 🟢 | URL de retour Wave (fallback : URL publique de l'app). |
| `INTOUCH_WAVE_CANCEL_URL` | Intouch (Wave) | 🟢 | URL d'annulation Wave. |
| `INTOUCH_PUBLIC_APP_URL` | Intouch | 🟢 | URL publique de l'app vue par Intouch (fallback `NEXT_PUBLIC_APP_URL`). |
| `PAYMENT_CALLBACK_SECRET` | App (webhook) | 🟠 | Secret HMAC SHA-256 de vérification du webhook `/api/payments/callback` (header `x-webhook-signature`). **Obligatoire en production** : sans lui, le webhook n'est pas authentifié. |
| `MAX_TRANSFER_AMOUNT_XOF` | App (paiements) | 🟢 | Plafond maximal d'un transfert de fonds en XOF (contrôle serveur). Laisser vide pour désactiver. |
| `CRON_SECRET` | Edge Functions (EF) | 🟠 | Secret Bearer des fonctions planifiées (`Authorization: Bearer <CRON_SECRET>`) : rappels, expirations, paiements mensuels, impayés. **Obligatoire en production** : sans lui, ces fonctions ne sont pas authentifiées. À définir côté scheduler ET dans les secrets des Edge Functions. |

## Signature — CRYPTONEO / ANSUT (Next.js + EF)

| Variable | Service | Niveau | Rôle & où l'obtenir |
|---|---|---|---|
| `CRYPTONEO_API_URL` | CRYPTONEO | 🔴 | URL de la plateforme de signature (défaut : `https://signature.ansut.ci`). |
| `CRYPTONEO_APP_KEY` | CRYPTONEO | 🔴 | Clé d'application — fournie par CRYPTONEO/ANSUT. |
| `CRYPTONEO_APP_SECRET` | CRYPTONEO | 🔴 | Secret d'application. |

## KYC — RNPP Connect / ONECI (Next.js + EF)

| Variable | Service | Niveau | Rôle & où l'obtenir |
|---|---|---|---|
| `RNPP_API_BASE` | RNPP Connect | 🔴 | Base de l'API KYC identité (défaut : `https://kyc.rnpp-connect.ci/api`). |
| `RNPP_API_KEY` | RNPP Connect | 🔴 | Clé d'API RNPP Connect. |

## KYC — NeoFace / AIneo (EF uniquement)

| Variable | Service | Niveau | Rôle & où l'obtenir |
|---|---|---|---|
| `NEOFACE_API_BASE` | NeoFace | 🔴 | Base de l'API faciale (défaut EF : `https://neoface.aineo.ai/api/v2`). |
| `NEOFACE_BEARER_TOKEN` | NeoFace | 🔴 | Bearer token — obligatoire pour l'Edge Function `kyc-face-auth`. |

## Messagerie — ANSUT Hub (Next.js + EF)

| Variable | Service | Niveau | Rôle & où l'obtenir |
|---|---|---|---|
| `ANSUT_API_BASE_URL` | ANSUT | 🔴 | Base de la passerelle SMS/email (défaut : `https://ansuthub.westeurope.cloudapp.azure.com/gateway/api`). Sans elle, envois SMS/email silencieusement ignorés. |
| `ANSUT_API_USERNAME` | ANSUT | 🔴 | Identifiant du compte ANSUT. |
| `ANSUT_API_PASSWORD` | ANSUT | 🔴 | Mot de passe du compte ANSUT. |
| `ANSUT_SMS_SENDER` | ANSUT | 🟢 | Nom d'expéditeur SMS (défaut : `ANSUT`). |

## Assistant — SUTA / Azure OpenAI (Next.js uniquement, serveur)

| Variable | Service | Niveau | Rôle & où l'obtenir |
|---|---|---|---|
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI | 🟠 | Endpoint de la ressource. Sans lui, le chatbot SUTA répond en mode dégradé. |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI | 🟠 | Clé d'API de la ressource — **serveur uniquement** (`/api/suta`). |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | Azure OpenAI | 🟢 | Nom du déploiement du modèle (défaut du code : `gpt-5.6-luna`). |
| `AZURE_OPENAI_API_VERSION` | Azure OpenAI | 🟢 | Version de l'API (défaut du code : `2025-04-01-preview`). |

## Notes

- **Injection automatique** : les Edge Functions Supabase reçoivent `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` automatiquement de la plateforme — inutile de les déclarer dans les secrets (mais elles doivent l'être pour la partie Next.js).
- **Cohérence Next.js ↔ Edge Functions** : les variables Intouch, CRYPTONEO, RNPP, ANSUT sont lues dans les deux contextes (`process.env` côté Next, `Deno.env.get` côté EF) — les maintenir synchrones.
- **Variables de tooling** (`NODE_ENV`, `BUILD_TARGET`) : gérées par le framework/les scripts, pas à déclarer.
- Vérification locale de l'inventaire : `rg -o "process\.env\.[A-Z_]+" src/ middleware.ts scripts/` et `rg -o "Deno\.env\.get\('[A-Z_]+'\)" supabase/functions/`.
