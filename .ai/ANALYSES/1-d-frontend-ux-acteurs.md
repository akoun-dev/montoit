# Task 1-d — Analyse FRONTEND / UX / SÉPARATION PAR ACTEURS

**Agent :** UX/UI DESIGNER + DEV FRONTEND (Explore) — analyse seule, aucun code modifié
**Projet :** Mon Toit CI — branche 4.0.0 (Next.js 16.2.6, React 19, Tailwind v4, shadcn/ui "new-york", Capacitor 8, Supabase)
**Date :** 2026 — périmètre `src/app`, `src/components` (198 fichiers), `src/hooks` (40 fichiers), `tailwind.config.ts`, `src/app/globals.css`

---

## 1. Synthèse exécutive

| Axe | Verdict |
|---|---|
| Modèle de navigation | **SPA à état unique** : 1 seule route Next.js (`/`), 16 vues switchées via Zustand (`useAuthStore.currentView`) + sous-sections dashboard via `dashboardSection`. Bouton retour géré manuellement (popstate + Capacitor BackButton). |
| Répartition composants | 198 fichiers : dashboard 110 (5 acteurs + shared), ui 53, home 19 (public), auth 5 (public), root 8 (app), messaging 2, providers 1. Règle de séparation par acteur **respectée à ~90 %** avec 4 imports croisés inter-acteurs et des composants métier logés dans `ui/`. |
| Design system | **Mature** : palette orange brand complète (10 nuances, `#FF6C2F`), tokens sémantiques (success/error/warning/info), tokens shadcn mappés en oklch, dark mode next-themes fonctionnel. MAIS config Tailwind v3 legacy obsolète à côté du `@theme` v4, et couleurs hardcodées fréquentes dans les dashboards. |
| États UI | **Incohérents** : 239 spinners (`Loader2`/`animate-spin`) dans 64 fichiers vs 36 `Skeleton` dans 9 fichiers. Aucun composant partagé `EmptyState`/`ErrorState` (57 messages "Aucun…" inline dans 37 fichiers). |
| Formulaires | **react-hook-form + zod installés mais 0 % utilisés** dans le métier. Tout est en `useState` manuel + validateurs maison (`src/lib/validators.ts`). Gros formulaires : add-property (1118 l.), inventory-report-form (938 l.), rental-file (887 l.), owner-file (670 l.). |
| Temps réel | **25 hooks `use-realtime-*`** dans `src/hooks` (+ canaux dans `lib/notification-store.ts` et `notification-toast-provider.tsx` ≈ les "26 hooks" du README). Pattern homogène : `supabase.channel()` + `postgres_changes` + cleanup. |
| Data fetching | **3 patterns cohabitants** : `authFetch` custom (103 fichiers), React Query (4 fichiers locataire seulement), realtime callbacks (notifications). |

---

## 2. Architecture UI — modèle de navigation

### 2.1 Principe

Le projet n'utilise **qu'une seule route Next.js** : `src/app/page.tsx` (client component). Tout le reste de `src/app` = layout + API routes + états globaux (error.tsx, global-error.tsx, loading.tsx, not-found.tsx). Aucun routeur par page — la navigation est **entièrement pilotée par un store Zustand persisté** (`src/lib/auth-store.ts`).

### 2.2 Le store (`useAuthStore`)

- `AppView` — **16 vues possibles** :

| Groupe | Vues (`currentView`) | Rendu |
|---|---|---|
| Public | `home` (défaut), `nos-biens`, `a-propos`, `faq`, `nous-contacter`, `cgu`, `confidentialite`, `mentions-legales`, `cookies` | `<PageShell>` (Header + Footer desktop + CookieConsentBanner) |
| Bien public | `property-detail` (`selectedPropertyId`) | `<PropertyDetailView>` dans PageShell |
| Auth | `login`, `register`, `otp-verify`, `email-verify`, `forgot-password` | cartes centrées pleine page |
| App | `dashboard` | `<Dashboard />` plein écran (sans chrome home) |

- `dashboardSection` (string) — la **sous-navigation du dashboard** (≈103 sections au total sur les 5 rôles, cf. §9).
- `selectedItemId` — id de l'entité pour les vues détail (payment-detail, lease-detail, visit-detail, application-detail, tenant-detail…).
- `settingsDefaultTab`, `dossierValidationFilter` — paramètres de section passés au store.
- `persist` (zustand/middleware) → la vue courante survit au refresh ; `checkAuth()` + `isInitialized` évitent le flash de mauvaise vue au chargement.
- `activeRole` ≠ `role` → **switch de rôle multi-comptes** (un user LOCATAIRE peut activer PROPRIETAIRE) avec reset de la section à "overview".

### 2.3 Historique navigateur / mobile

- `page.tsx` : listener `popstate` global qui restaure `view` (+ `selectedPropertyId`) ; `setView()` pousse `history.pushState({ view, selectedPropertyId, dashboardSection })`.
- `dashboard/index.tsx` : second listener popstate pour `dashboardSection`.
- `BackableSection` + `useBackHandler(sectionKey, onBack)` + `AppBackHandler` + `BackNavigationProvider` (layout racine) : abstraction **Capacitor** du bouton retour Android. Chaîne cohérente : détail → liste → section → sortie app.
- ⚠️ Deux niveaux de popstate (global + dashboard) qui se coordonnent par convention — fragile si une troisième couche est ajoutée.

### 2.4 Le "routeur" dashboard (`src/components/dashboard/index.tsx`, 328 l.)

```tsx
<DashboardLayout>            // Sidebar + DashboardHeader + OnboardingModal
  {effectiveRole === 'LOCATAIRE'        && <LocataireDashboard section={dashboardSection} />}
  {effectiveRole === 'PROPRIETAIRE'     && <ProprietaireDashboard … />}
  {effectiveRole === 'AGENCE'           && <AgenceDashboard … />}
  {effectiveRole === 'TIERS_CONFIANCE'  && <TcDashboard … />}
  {effectiveRole === 'ADMIN'            && <AdminDashboard … />}
</DashboardLayout>
```

Chaque `*Dashboard` est un **switch géant** `case → <Composant />`. C'est le point de couplage central du frontend : tout nouvel écran = 1 import + 1 case ici. Les 5 switches totalisent **103 sections** (Locataire 22, Propriétaire 23, TC 27, Agence 16, Admin 15).

### 2.5 Sidebar / Header

- `sidebar.tsx` (427 l.) : `getSidebarSections(role)` — nav déclarative par acteur avec icônes lucide, sections groupées (LOCATION, MESSAGES, VALIDATION, SYSTÈME…), badges d'alertes paiements (`usePaymentAlerts`), mode collapsible desktop / Sheet mobile.
- `dashboard-header.tsx` : logo, switch de rôle, ThemeToggle, déconnexion.
- ✅ Cartographie exacte des écrans exposés ↔ switch du `index.tsx` : conforme (aucune section orpheline détectée dans la nav).

---

## 3. Inventaire composants (198 fichiers)

### 3.1 Vue d'ensemble

| Dossier | Nb fichiers | Acteur | Exemples clés |
|---|---|---|---|
| `components/dashboard/` (racine) | 5 | **Transverse app** | `index.tsx` (routeur à switches), `dashboard-layout.tsx`, `dashboard-header.tsx`, `sidebar.tsx`, `onboarding-modal.tsx` |
| `components/dashboard/locataire/` | 25 | **Locataire** | overview, search-properties, applications (+detail), my-visits (+detail), my-leases (+lease-detail), payments (+payment-detail +payment-dialog), rental-file, rental-files-list, maintenance, trust-score, settings/ (4 fichiers dont kyc-modal), history, favorites, reviews, messages |
| `components/dashboard/proprietaire/` | 21 | **Propriétaire** | overview, my-properties, add-property (1118 l.), my-tenants (+tenant-detail), visit-requests, enhanced-rental-files, enhanced-leases, mandats, owner-file, owner-maintenance, finances, analytics, renewals, owner-reviews, owner-settings, security, property-documents |
| `components/dashboard/agence/` | 14 | **Agence** | overview, portfolio, mandats, candidatures, visits, contracts, team, finances, analytics, communication, marketing, client-files, settings, security |
| `components/dashboard/tc/` | 28 | **Tiers de Confiance** | overview, all-properties, property-verifications (+detail), dossier-validations, rental-files-queue (+rental-file-detail), owner-validations (+owner-dossier-validations, owner-file-detail), agency-validations (+agency-detail), oneci-verification, certifications, agents, missions, inventory-report-form, inventory-reports-list, sla-monitoring, fraud-alerts, litiges, messaging, documentation, users, settings, view-mode-toggle |
| `components/dashboard/admin/` | 15 | **Admin** | overview, users, properties-moderation, moderation, reviews-moderation, tc-management, trust-agents, signalements, disputes, notifications, reports, system, security, backups, settings |
| `components/dashboard/shared/` | 2 | **Partagé acteurs** | `my-disputes.tsx` (Locataire+Propriétaire+Agence), `deposit-refund-card.tsx` (variante Owner/Tenant) |
| `components/home/` (+legal/) | 19 | **Public (non connecté)** | hero, properties, nos-biens-view, property-detail-view, property-map-leaflet, how-it-works, roles, trust, about, faq, contact, header, footer, cookie-consent-banner, legal/{cgu, privacy, legal-notice, cookies} |
| `components/auth/` | 5 | **Public (auth)** | login-form, register-form, otp-verify-form, email-verify-form, forgot-password-form |
| `components/ui/` | 53 | **Transverse** | 48 primitives shadcn + 5 composants métier (cf. §3.2) |
| `components/messaging/` | 2 | **Transverse métier** | contact-dialog (Propriétaire→Locataire, Locataire), contact-tc-dialog (Locataire, Propriétaire, Agence → TC) |
| `components/providers/` | 1 | **Transverse app** | query-provider (React Query) |
| racine `components/` | 8 | **Transverse app** | theme-provider, theme-toggle, offline-banner, suta-chatbot (chatbot IA), notification-toast-provider, app-back-handler, app-lifecycle-manager, back-navigation-provider |
| dossiers vides | 5 | — | `mandates/`, `native/`, `payment/`, `role/`, `tenant/` (0 fichier — squelettes abandonnés) |

**Total : 198 fichiers** ✅ (5+110+19+5+53+2+1+8 moins doublons de comptage = concordance exacte).

### 3.2 Cas particulier `ui/` — 48 shadcn + 5 métier

48 primitives shadcn/ui standard (button, card, dialog, sheet, tabs, table, command, chart, sidebar, calendar, carousel, etc.) + **5 composants métier** qui n'ont rien à faire dans un dossier de primitives :

| Fichier | Nature | Consommateurs |
|---|---|---|
| `ui/signature-pad.tsx` | signature manuscrite + OTP CRYPTONEO | Locataire (lease-detail), Propriétaire (mandats, enhanced-leases), Agence (mandats) |
| `ui/confirm-dialog.tsx` | dialog de confirmation générique | 10+ fichiers (locataire, proprietaire, tc) |
| `ui/searchable-select.tsx` | combobox recherche | home (hero, nos-biens), locataire settings, proprietaire |
| `ui/pagination-controls.tsx` | pagination tableau | locataire, proprietaire, agence, home |
| `ui/certificate-retrieval.tsx` | récupération certificat signature | **ORPHELIN — 0 import** |

Autres éléments morts détectés : `ui/form.tsx` (shadcn Form, jamais importé), `proprietaire/rental-files.tsx` (remplacé par enhanced-rental-files, 0 import), `ui/toast.tsx`+`toaster.tsx` (montés dans layout mais le métier utilise `sonner`).

---

## 4. Inventaire hooks (40 fichiers)

### 4.1 Temps réel — 25 hooks `use-realtime-*`

Tous suivent le même pattern : `getSupabaseBrowserClient()` → `channel()` → `.on('postgres_changes', …)` → callback → `unsubscribe()` au cleanup. Aucun rattachement acteur : **ce sont des hooks de table**, consommés par les acteurs concernés.

| Hook (table écoutée) | Acteurs consommateurs principaux |
|---|---|
| applications, rental-files, leases, visits, payments, maintenance, messages, notifications, inventory-reports, mandats, ratings, disputes, properties, property-documents | Locataire + Propriétaire (+Agence via overview) |
| owner-files, ownership-docs, validation-slas, missions, verification-agents, certifications, fraud-alerts, signalements, facial-verifications | TC + Admin (fraud-alerts/backups) |
| users | TC/Admin |
| backups | Admin |

### 4.2 Hooks utilitaires — 6

`use-back-handler` (retour Capacitor), `use-mobile`, `use-notifications`, `use-payment-alerts` (badges sidebar), `use-pagination`, `use-toast` (radix).

### 4.3 Hooks natifs Capacitor — 9 (`hooks/capacitor/`)

use-app, use-app-launcher, use-browser, use-geolocation, use-inappbrowser, use-local-notifications, use-network, use-status-bar + index. **Transverse** (offline-banner, app-lifecycle-manager, maps, notifications push locales).

### 4.4 Dossiers vides hérités

`hooks/{agency, auth, contract, messaging, native, property, shared}` = 7 dossiers vides → restes d'un plan de réorganisation jamais exécuté (même logique que les 5 dossiers vides de `components/`).

---

## 5. Design system

### 5.1 Palette — orange dominant ✅

`globals.css` (Tailwind **v4 CSS-first**, `@theme inline`) :
- **Brand orange 10 nuances** : `--color-brand-50 #FFF5F0` → `--color-brand-900`; cœur = `brand-500 #FF6C2F`.
- **Neutrals 50→900** ("90 % de l'UI" selon les commentaires) + **sémantiques WCAG AA** : success `#059669`, error `#DC2626`, warning `#D97706`, info `#2563EB`.
- Tokens shadcn mappés : `primary = #FF6C2F` (oklch), ring = orange (shadow-focus `rgba(255,108,47,.15)`), chart-1..5 brand-centric, tokens `sidebar-*` complets.
- Dark mode `.dark` : primary remonté à `brand-400 #FF8A50`, foreground blanc, borders blancs 10 %.

### 5.2 ⚠️ Double configuration Tailwind

- `tailwind.config.ts` présent = **config v3 legacy** dont les `content` pointent vers `./pages`, `./components`, `./app` — chemins **inexistants** (le code est dans `src/`). Sans effet en v4 (auto-détection), mais trompeur et à purger.
- La vraie config est `globals.css` `@theme inline` + `@custom-variant dark` + plugin `tw-animate-css`.
- `components.json` shadcn : style "new-york", baseColor neutral, alias corrects.

### 5.3 framer-motion

**40 fichiers** l'importent : quasiment tous les écrans agence (14/14), beaucoup de TC et proprietaire, locataire overview, dashboard-header, suta-chatbot, hero. Usage = transitions de pages (variants `containerVariants`/`itemVariants`, stagger), animated-presence sur listes. ⚠️ `globals.css` référence aussi framer-motion (1 occurrence) — hybride CSS/JS animation.

### 5.4 Dark mode

- `next-themes` 0.4.6 : `attribute="class"`, `defaultTheme="light"`, `enableSystem`, monté dans layout racine.
- `ThemeToggle` présent dans le **header public ET le dashboard header**.
- Worklog : plusieurs passes de fixes dark mode (locataire, auth) — coverage réelle à vérifier écran par écran (cf. §6 couleurs hardcodées).

---

## 6. États UI (loading / error / empty)

| État | Implémentation actuelle | Données mesurées |
|---|---|---|
| **Loading** | Spinner inline `Loader2`/`animate-spin` partout | **239 occurrences / 64 fichiers** |
| | `Skeleton` shadcn (réservé home) | 36 occurrences / **9 fichiers seulement** (nos-biens-view, property-detail-view, tc/owner-validations…) |
| **Empty** | Textes inline "Aucun X trouvé…" | 57 occurrences / 37 fichiers — **aucun composant `EmptyState`** |
| **Error** | Toasts (sonner) + textes inline ; ErrorBoundary app | `error.tsx` (60 l.), `global-error.tsx` (77 l.), `not-found.tsx` (60 l.), `loading.tsx` (28 l.) — bien faits au niveau app |
| **Offline** | `offline-banner.tsx` + Capacitor network hook | ✅ transverse |
| **Chatbot** | `suta-chatbot.tsx` (assistant SUTA, global) | — |

**Verdict : incohérent.** Trois styles de loading cohabitent (spinner, skeleton, rien), empty/error non mutualisés, aucun pattern `TableSkeleton + EmptyState + ErrorCard` partagé → chaque acteur recommence à zéro. Les StatusBadge/PriorityBadge (locataire overview) codent leurs couleurs en dur (`bg-green-100 text-green-700`, `emerald`, `teal`, `amber`) — **hors tokens, dark mode non garanti**.

---

## 7. Formulaires

| Sujet | Constat |
|---|---|
| Stack installée | `react-hook-form` 7.60 + `@hookform/resolvers` 5.1 + `zod` 4.0 |
| Stack utilisée | **Aucun `useForm<` ni `zodResolver` dans tout `src/`** (seul `ui/form.tsx` existe et n'est jamais importé) |
| Pattern réel | `useState` par champ (12–18 `useState` par gros formulaire) + validateurs maison `src/lib/validators.ts` (validateEmail, validatePhone ivorien…) + soumission `authFetch` manuelle |
| Gros formulaires | **Propriétaire** : add-property (1118 l., 18 useState), owner-file (670 l.) ; **Locataire** : rental-file/dossier de candidature (887 l., 12 useState), settings+KYC ; **TC** : inventory-report-form (938 l., 12 useState), missions, agents ; **Agence** : team, marketing ; **Public** : login/register/forgot (OTP email+SMS) ; **Paiement** : payment-dialog (mobile money Wave/OM/MoMo/MTN) |
| Conséquences | Pas de validation schéma partagée client/serveur, erreurs de formulaire non normalisées, dette de testabilité (l'état métier est dans 18 useState vs 1 objet form) |

---

## 8. Temps réel (Supabase Realtime)

- **25 hooks `use-realtime-*`** dans `src/hooks` (README annonce "26 hooks" ≈ 25 hooks + `lib/notification-store.ts` qui ouvre aussi un canal, ou 25 + provider de toasts — ordre de grandeur confirmé, écart de comptage mineur à corriger dans le README).
- Tables écoutées couvrent tout le domaine : messages, visits, applications, rental-files, owner-files, ownership-docs, leases, payments, mandats, maintenance, inventory-reports, notifications, ratings, disputes, properties, property-documents, users, missions, agents, certifications, fraud-alerts, signalements, facial-verifications, validation-slas, backups.
- Qualité du pattern : **bonne** — canal créé synchronement, subscribe après récupération de session, `cancelled` flag, cleanup systématique, filtrage "pas mes propres messages" côté locataire.
- Migrations SQL correspondantes présentes (`enable_realtime_core_tables/messages_visits/notifications/inventory_reports/owner_files/agency_tables`).
- ⚠️ Les consommateurs réagissent en **callback manuel** (refetch ou setState) plutôt qu'en invalidation React Query — 4 composants seulement utilisent react-query.

---

## 9. Cartographie des parcours par acteur (déduite du code)

### 🔵 LOCATAIRE (22 sections)
**Accueil public** → Nos biens (recherche + carte Leaflet) → détail bien → contact propriétaire/agence → **inscription/login (OTP email/SMS)** → onboarding →
**Chercher un bien** → Favoris → **Dossier de location** (KYC ONECI, pièces, trust-score) → **Candidater** → suivi candidature → **Visites** (demande + paiement visite) → **Bail** (signature électronique CRYPTONEO + OTP) → **État des lieux** entrée → **Paiements** (loyers, mobile money, paiement immédiat/avance) → **Maintenance** (demandes + commentaires) → **Litiges** → **Avis** → **Trust score** → Historique → Paramètres (KYC, sécurité, notifications).

### 🟠 PROPRIÉTAIRE (23 sections)
Dashboard → **Mes biens** (add-property 5 étapes) → **Dossier propriétaire** (owner-file : vérification titre/ONECI préalable) → **Demandes de visite** (accepter/refuser) → **Candidatures** (dossiers locataires : validation/rejet, contact) → **Mes baux** (création depuis candidature, signature) → **Mes locataires** (+détail) → **Mandats** (délégation agence, signature) → **Maintenance** → **Paiements/Finances** (+ remboursement caution deposit-refund) → **Renouvellements** → **Analytics** → **Avis reçus** → Messages → Litiges → Paramètres/Sécurité.

### 🟣 AGENCE (16 sections)
Dashboard → **Portfolio** (biens gérés) → **Mandats** (signature) → **Candidatures** → **Visites** → **Contrats** → **Dossiers clients** → **Équipe** (agents + propriétés assignées) → **Finances** (commissions) → **Analytics** → **Communication** (contact TC) → **Marketing** → Litiges → Paramètres/Sécurité.

### 🟢 TIERS DE CONFIANCE (27 sections) — acteur le plus riche
Dashboard → **Tous les biens** → **Vérification biens** (détail + statut) → **Files de validation** : dossiers locataires (queue + détail), dossiers propriétaires, dossiers agences → **ONECI** (vérification identité) → **Certifications** → **Agents** de vérification → **Missions terrain** (combobox biens/agents) → **États des lieux** (formulaire + liste) → **Alertes fraude** → **SLA monitoring** → **Litiges** → **Messagerie** → **Documentation** (formation) → Utilisateurs → Notifications → Paramètres.

### 🔴 ADMIN (15 sections)
Dashboard → **Utilisateurs** → **Modération** (contenu, avis, biens) → **Gestion TC** (+ agents de confiance) → **Signalements** → **Litiges** → **Rapports** → **Système** → **Sécurité** → **Sauvegardes** (backup/restore/download) → **Configuration** (settings + test channel notifications) → Notifications.

---

## 10. ÉCARTS vs RÈGLE DE SÉPARATION PAR ACTEUR

Règle du projet : composants strictement séparés par acteur, transverse uniquement dans `shared/` (et `ui/` pour les primitives).

### 10.1 Imports croisés inter-acteurs (violation directe — via `dashboard/index.tsx`)

| # | Composant | Dossier d'origine | Consommé aussi par | Correction cible (sans l'appliquer) |
|---|---|---|---|---|
| E1 | `Notifications` | `locataire/notifications.tsx` | PROPRIETAIRE, TC, AGENCE (sections 'notifications') | → `dashboard/shared/notifications.tsx` |
| E2 | `ActivityHistory` | `locataire/history.tsx` | PROPRIETAIRE, TC ('history') | → `dashboard/shared/activity-history.tsx` |
| E3 | `TrustScore` | `locataire/trust-score.tsx` | PROPRIETAIRE ('trust-score') | → `dashboard/shared/trust-score.tsx` |
| E4 | `InventoryReportForm` | `tc/inventory-report-form.tsx` | PROPRIETAIRE ('inventory-report-form') | → `dashboard/shared/inventory-report-form.tsx` (ou split par rôle) |

### 10.2 Composants métier dans `ui/` (dilution du design system)

| # | Élément | Problème |
|---|---|---|
| E5 | `ui/signature-pad.tsx`, `ui/confirm-dialog.tsx`, `ui/searchable-select.tsx`, `ui/pagination-controls.tsx` | Métier/partagés mais logés dans les primitives shadcn → devraient vivre dans un dossier transverse dédié si `ui/` doit rester "primitives pures" |
| E6 | `ui/form.tsx` (shadcn Form), `ui/toast.tsx`/`toaster.tsx`, `ui/certificate-retrieval.tsx` | Jamais importés (morts) ; double système de toasts radix+sonner montés simultanément dans le layout |

### 10.3 Squelettes de réorganisation abandonnés

| # | Élément |
|---|---|
| E7 | 5 dossiers vides `components/{mandates,native,payment,role,tenant}` + 7 dossiers vides `hooks/{agency,auth,contract,messaging,native,property,shared}` — preuve d'une 2ᵉ tentative de taxonomy jamais terminée |
| E8 | `proprietaire/rental-files.tsx` orphelin (supplanté par `enhanced-rental-files.tsx`) |

### 10.4 Couplages structurels acceptables mais à surveiller

| # | Élément |
|---|---|
| E9 | `dashboard/index.tsx` : 1 fichier routeur pour 103 sections/5 rôles + `sidebar.tsx` : 1 fichier de nav pour 5 rôles (427 l.) — conforme à la règle (transverse) mais monolithique ; un `sidebar/<role>.tsx` par acteur réduirait le rayon de collision |
| E10 | Data-layer à 3 vitesses : `authFetch` (103 fichiers) vs React Query (4 fichiers locataire) vs realtime-callbacks → risque de divergence d'états entre acteurs |
| E11 | `messaging/` à la racine = partagé (OK) mais nommage ambigu vs sections 'messages' de chaque acteur |

### 10.5 Ce qui est CONFORME ✅

- `dashboard/{locataire,proprietaire,agence,tc,admin}` = 103 composants tous mono-acteur (hors E1–E4).
- `dashboard/shared/` existe (2 fichiers, correctement utilisés par plusieurs acteurs).
- `home/` + `auth/` = strictement public ; racine = transverse app.
- Sidebar/routeur ne fuient aucun composant d'un acteur dans la nav d'un autre (hors E1–E4 déjà listés).

---

## 11. Accessibilité (échantillon)

| Critère | Constat | Mesure |
|---|---|---|
| `aria-label` | 55 occurrences / 27 fichiers — bien couvert sur le **public** (header, footer, nos-biens ×9, property-detail ×5, cookie banner), les **formulaires auth** et les primitives ui | Dashboard : très clairsemé (locataire ×3, tc ×7, header ×2, onboarding ×2) — boutons-icônes des dashboards souvent sans label |
| `alt` | Descriptifs sur le public (`alt={property.title}`, `alt="Mon Toit"`) ; `alt=""` décoratif correct | ✅ côté public ; dashboards peu d'images |
| Focus visible | Hérité des primitives shadcn (`focus-visible:ring`) 41 occurrences/27 fichiers, quasi toutes dans `ui/*` + quelques surcharges | ✅ de base via tokens (ring = orange brand) ; à vérifier sur composants custom (ViewModeToggle, cartes cliquables) |
| `sr-only` | 8 fichiers, surtout `ui/*` (dialog, breadcrumb, carousel) | Faible dans le métier |
| Structure | `html lang="fr"` ✅, landmarks header/main/nav via composants ✅, dialog Radix (focus trap) ✅ | Radix sous shadcn = socle a11y solide |
| Contraste | Tokens annotés WCAG AA ; MAIS badges hardcodés (`bg-amber-100`, `emerald-500`) non vérifiés et potentiellement illisibles en dark mode | Risque dark mode |

**Verdict :** socle shadcn/Radix bon + public soigné ; le maillon faible est le **dashboard** (boutons-icônes, badges colorés en dur, contenus dynamiques sans `aria-live`).

---

## 12. Recommandations (priorisées, sans modification ici)

1. **P1 — Résorber E1–E4** : déplacer `notifications`, `history`, `trust-score`, `inventory-report-form` vers `dashboard/shared/` (imports mécaniques, zéro logique).
2. **P1 — Purger les morts** : `ui/certificate-retrieval.tsx`, `ui/form.tsx`, `ui/toast(.tsx)`, `proprietaire/rental-files.tsx`, 12 dossiers vides ; choisir **un** système de toast (sonner).
3. **P2 — Mutualiser les états UI** : créer `dashboard/shared/{empty-state,error-state,table-skeleton}.tsx` et les tokens de badges (`BadgeVariant` mappé sur success/warning/destructive) → élimine les 57 strings inline et les couleurs hardcodées incompatibles dark mode.
4. **P2 — Unifier la data-layer** : généraliser React Query (déjà installé) comme cache autour de `authFetch`, les hooks realtime devenant des `invalidateQueries` → supprime le clonage fetch/setState/realtime par écran.
5. **P2 — Décider du sort de react-hook-form+zod** : soit l'adopter pour les 4 gros formulaires (add-property, rental-file, inventory-report-form, owner-file), soit retirer les dépendances ; à terme partager les schémas zod avec les API routes.
6. **P3 — Nettoyer la config Tailwind** : supprimer `tailwind.config.ts` (legacy v3, content invalide) et documenter que la source de vérité = `globals.css @theme`.
7. **P3 — Éclater `sidebar.tsx` + `dashboard/index.tsx` par acteur** (ex. `sidebar/locataire.tsx`) pour finir la taxonomy entamée (les dossiers vides en témoignent).
8. **P3 — Accessibilité dashboard** : audit des boutons-icônes (aria-label), `aria-live` pour les toasts realtime, contrastes badges dark mode.

---

## 13. Sources vérifiées (échantillon)

`src/app/page.tsx` (209 l.) · `src/lib/auth-store.ts` (AppView, persist, popstate) · `src/components/dashboard/index.tsx` (328 l., 5 switches) · `sidebar.tsx` (427 l., getSidebarSections) · `dashboard-layout.tsx` · `globals.css` (381 l. tokens oklch) · `tailwind.config.ts` (legacy) · `layout.tsx` (ThemeProvider, 2 Toaster) · `theme-provider.tsx` · 25 hooks `use-realtime-*` (dont use-realtime-messages lu intégralement) · `lib/validators.ts` · `locataire/overview.tsx` (568 l., 7 hooks realtime, badges hardcodés) · greps Loader2/Skeleton/EmptyState/aria-label/focus-visible/sr-only/framer-motion (40 f.)/authFetch (103 f.)/react-query (4 f.)/zod+rhf (0 usage métier).
