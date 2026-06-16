# Mon Toit CI

Plateforme de gestion locative tout-en-un pour le marché ivoirien. Locataires, propriétaires, agences et tiers de confiance connectés sur un écosystème unique.

## Architecture

```
Frontend (Next.js) → API Routes (Next.js) → Edge Functions (Supabase) → APIs externes
                                                      ↓
                                              Supabase (Postgres + Realtime)
```

- **Framework:** Next.js (App Router)
- **Auth:** Supabase Auth + `resolveRequestUser` / `applyCookies`
- **Base de données:** Supabase (PostgreSQL) — migration Prisma terminée
- **Realtime:** Supabase Realtime — 26 hooks pour les mises à jour en direct
- **Paiement:** Intouch API (Orange Money, MTN MoMo, Moov Money, Wave)
- **Signature:** CRYPTONEO (signature électronique certifiée)
- **KYC:** ONECI + NeoFace (vérification d'identité biométrique)
- **Mobile:** Capacitor (iOS/Android)
- **UI:** Tailwind CSS + shadcn/ui + Framer Motion

## Rôles et fonctionnalités

### 👤 Locataire (20 composants)
| Section | Description |
|---------|-------------|
| **Mon espace** | Vue d'ensemble : logement, paiements, visites, maintenance |
| **Chercher un bien** | Catalogue avec filtres (ville, type, budget) |
| **Mes favoris** | Biens sauvegardés |
| **Mes candidatures** | Dossiers de location, statut en temps réel |
| **Mes visites** | Demandes de visite, planning |
| **Mes contrats** | Baux actifs, signature électronique |
| **Mes paiements** | Historique, paiement mobile money |
| **Messages** | Messagerie temps réel avec pièces jointes |
| **Maintenance** | Demandes d'intervention + suivi |
| **Paramètres** | Profil, 2FA, notifications |

### 🏠 Propriétaire (20 composants)
| Section | Description |
|---------|-------------|
| **Mon espace** | KPIs, revenus, biens, locations |
| **Mes biens** | Gestion, création avec upload photos/vidéos |
| **Mes locataires** | Liste, détails, historique paiements |
| **Demandes de visite** | Accepter/refuser/proposer autre date |
| **Mes candidatures** | Valider/rejeter les dossiers locataires |
| **Mes baux** | Création assistée, signature, résiliation |
| **Mes mandats** | Création et signature de mandats |
| **Maintenance** | Suivi des demandes, assignation |
| **Paiements** | État des loyers, rappels |
| **Mes finances** | Tableau de bord financier, graphiques |
| **Analytics** | Performances, tendances, comparaisons |
| **Messages** | Messagerie avec locataires et agence |
| **Paramètres** | Profil, sécurité, préférences |

### 🏢 Agence (14 composants)
| Section | Description |
|---------|-------------|
| **Mon espace** | Pipeline commercial, visites du jour, portefeuille |
| **Nos biens** | Portefeuille immobilier de l'agence |
| **Mandats** | Gestion et signature des mandats de gestion |
| **Candidatures** | Suivi des dossiers locataires |
| **Visites** | Planification et gestion |
| **Contrats** | Création de baux pour le compte des propriétaires |
| **Équipe** | Gestion des agents |
| **Finances** | Commissions, revenus |
| **Analytics** | Performance, tendances |
| **Communication** | Messagerie centralisée |
| **Marketing** | Promotion des biens |
| **Dossiers clients** | Gestion documentaire |

### 🔍 Tiers de Confiance (24 composants)
| Section | Description |
|---------|-------------|
| **Mon espace** | KPIs, SLA, alertes, files d'attente |
| **Tous les biens** | Catalogue complet |
| **Vérification biens** | Approuver/rejeter les annonces |
| **Dossiers locataires** | Validation documentaire avec Kanban |
| **Validations propriétaires** | Documents fonciers |
| **Validations agences** | Agréments, RCCM |
| **Vérification ONECI** | Identité biométrique |
| **Utilisateurs** | Annuaire plateforme |
| **Certifications** | Émettre/révoquer |
| **Rapports d'état des lieux** | Création et consultation |
| **Agents** | Gestion des vérificateurs terrain |
| **Missions** | Attribution des tâches |
| **Alertes fraude** | Détection et enquête |
| **Litiges** | Workflow complet (impayés, dégradations…) |
| **Suivi SLA** | Conformité et délais |
| **Messagerie** | Communication interne |

## API Routes

```
/api/admin/*          — Administration plateforme
/api/agence/*         — Agence (agents, commissions)
/api/applications/*   — Candidatures locataires
/api/auth/*           — Authentification
/api/dashboard/*      — Agrégats par rôle (5 endpoints)
/api/favorites/*      — Favoris
/api/kyc/*            — Vérification faciale
/api/leases/*         — Baux (CRUD, signature, résiliation)
/api/maintenance/*    — Demandes d'intervention
/api/mandats/*        — Mandats de gestion
/api/messages/*       — Messagerie
/api/notifications/*  — Notifications
/api/owner/*          — Propriétaire (analytics, finances)
/api/payments/*       — Paiements (initiation, callback)
/api/properties/*     — Biens immobiliers (CRUD, upload média)
/api/rental-files/*   — Dossiers de location
/api/reviews/*        — Avis
/api/scoring/*        — Score de confiance
/api/signature/*      — Signature électronique
/api/tc/*             — Tiers de confiance (14 sous-routes)
/api/tenants/*        — Gestion locataires
/api/user/*           — Profil utilisateur
/api/visits/*         — Visites
```

## Edge Functions (Supabase)

```
payment-initiate/     — Initiation paiement Intouch
payment-callback/     — Webhook de retour Intouch
signature-auth/       — Authentification signature
generate-certificate/ — Certificat CRYPTONEO
sign-send-otp/        — Envoi OTP signature
sign/                 — Exécution signature
sign-verify/          — Vérification signature
signed-file/          — Fichier signé
kyc-face-auth/        — Authentification faciale NeoFace
oneci-match/          — Correspondance ONECI
oneci-face-auth/      — Vérification faciale ONECI
oneci-subscription/   — Abonnement ONECI
```

## Variables d'environnement

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Intouch Paiement
INTOUCH_BASE_URL=https://apidist.gutouch.net/apidist/sec/
INTOUCH_USERNAME=
INTOUCH_PASSWORD=
INTOUCH_PARTNER_ID=CI300373
INTOUCH_LOGIN_API=07084598370
INTOUCH_API_PASSWORD=
INTOUCH_SECURE_CODE_WEB=
INTOUCH_CALLBACK_URL=https://mon-toit.ci/api/payments/callback

# CRYPTONEO (Signature)
CRYPTONEO_API_URL=
CRYPTONEO_API_KEY=

# ONECI (KYC)
ONECI_API_KEY=
ONECI_API_URL=

# NeoFace (KYC)
NEOFACE_API_KEY=
NEOFACE_API_URL=
```

## Installation

```bash
pnpm install
cp .env.local.example .env.local
# Configurer les variables d'environnement
pnpm dev
```

## Déploiement Edge Functions

```bash
supabase functions deploy payment-initiate --no-verify-jwt
supabase functions deploy payment-callback --no-verify-jwt
# etc.
```

## Voir aussi

- [Audit complet des fonctionnalités](AUDIT.md)
- [Plan de migration Prisma → Supabase](AGENTS.md)
