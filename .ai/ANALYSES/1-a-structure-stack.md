# Analyse 1-a — Structure & Stack technique « Mon Toit CI »

- **Task ID** : 1-a | **Agent** : DEV FULLSTACK/DATA (Explore) | **Mode** : lecture seule
- **Périmètre** : `/home/z/my-project`, branche git **4.0.0** (HEAD `d206a4b`), remote `akoun-dev/montoit`
- **Contexte sandbox** : see worklog.md Task ID: 1 (codespace reconstruit sur la branche 4.0.0, dev server port 3000, DB Supabase externe)

---

## 1. Vue d'ensemble de l'arborescence

```
/home/z/my-project
├── src/                    460 fichiers (250 .ts, 209 .tsx, 1 .css)  ← tout le code applicatif
│   ├── app/                169   (7 fichiers de "pages" + 162 route.ts API en 39 domaines)
│   ├── components/         198   (ui 53, dashboard 110, home 19, auth 5, messaging 2, providers 1, racine 8)
│   ├── hooks/              40    (dont capacitor/ 9 — 25 hooks use-realtime-*)
│   ├── lib/                42    (dont supabase/ 8, auth/ 1)
│   └── test/               11    (10 tests + setup.ts)
├── supabase/
│   ├── migrations/         85 fichiers SQL (20260518… → 20260911…)
│   ├── functions/          25 Edge Functions + _shared (8 modules) + _test
│   └── config.toml         config CLI Supabase (project_id "montoit")
├── android/                Projet Capacitor Android complet (Gradle, Manifest, MainActivity)
├── ios/                    Projet Capacitor iOS complet (Xcode, AppDelegate, Info.plist)
├── e2e/                    2 scénarios Playwright (auth-flow, roles)
├── scripts/                13 fichiers (1 utilitaire build + 12 seed/inspect/cleanup)
├── public/                 images biens, logos paiements, PWA, offline.html
├── .ai/                    ADRs / ANALYSES / SPECS (vides — créés pour l'équipe) + LESSONS_LEARNED
├── agent-ctx/              32 notes de contexte d'agents précédents
├── analyse-acteurs/        5 docs métier (admin, agence, locataire, propriétaire, tiers de confiance)
├── db/custom.db            ⚠️ legacy SQLite Prisma (24 Ko, orphelin)
└── [configs] next.config.ts, middleware.ts, capacitor.config.ts, tailwind.config.ts,
             vitest.config.ts, playwright.config.ts, tsconfig.json, components.json,
             ecosystem.config.js, Caddyfile, eslint.config.mjs, postcss.config.mjs
```

### Détail `src/app` — architecture **SPA mono-page**
| Élément | Contenu |
|---|---|
| Pages | **UNE SEULE page** : `page.tsx` (`'use client'`) qui importe ~100+ vues (home, auth, dashboard, détail bien, pages légales). Pas de `/dashboard`, `/login`… en App Router |
| Fichiers racine | `layout.tsx` (metadata SEO FR complète, Inter font, 9 providers globaux), `error.tsx`, `global-error.tsx`, `loading.tsx`, `not-found.tsx`, `globals.css` |
| API | **162 `route.ts`** répartis en 39 domaines : tc 18, admin 13, auth 11, leases 9, user 8, payments 8, signature 7, properties 7, profile 7, kyc 6, agence 6, mandats 5, dashboard 5, owner-file 4, owner 4, messages 4, visits 3, settings 3, rental-file 3, maintenance 3, users 2, tenants 2, search-alerts 2, reviews 2, renewals 2, + applications, certificates, disputes, favorites, history, locataire, notifications, oneci, rental-files, scoring, seed, stats, suta… |

### Détail `src/components/dashboard` (110 fichiers) — un dossier par rôle
| Rôle | Fichiers | Exemples |
|---|---|---|
| tc (tiers de confiance) | 28 | dossier-validations, sla-monitoring, fraud-alerts, oneci-verification |
| locataire | 25 | search-properties, payments, trust-score, rental-file, settings/ |
| proprietaire | 21 | my-properties, enhanced-leases, finances, analytics, mandats |
| admin | 15 | users, backups, moderation, signalements, system |
| agence | 14 | portfolio, mandats, commissions, team, candidatures |
| shared + racine | 2 + layout/header/sidebar/index/onboarding-modal | `dashboard/index.tsx` = routeur client par rôle (switch sur `activeRole`) |

---

## 2. Stack technique déduite (fichiers réels)

### Framework & cœur
| Élément | Valeur | Source |
|---|---|---|
| Next.js | **^16.2.6** (App Router) | package.json |
| React | ^19.0.0 | package.json |
| TypeScript | ^5, `strict: true`, `noImplicitAny: false`, alias `@/* → src/*` | tsconfig.json |
| output | **`'standalone'`** | next.config.ts |
| serverActions | `bodySizeLimit: '100mb'` | next.config.ts (experimental) |
| images | remotePatterns unsplash/plus.unsplash + 127.0.0.1/localhost (⚠️ unsplash inutilisé dans src) | next.config.ts |
| reactStrictMode | false | next.config.ts |

### UI / Design system
| Rôle | Packages |
|---|---|
| CSS | Tailwind CSS **v4** (`@tailwindcss/postcss`), tw-animate-css, tailwindcss-animate |
| Composants | shadcn/ui style **new-york**, rsc: true, baseColor neutral, aliases `@/components`, `@/components/ui`, lucide — **53 composants ui/** |
| Primitives | 24 packages @radix-ui/react-* |
| Animation | framer-motion ^12, embla-carousel, vaul (drawer) |
| Icônes | lucide-react |
| Cartes | leaflet + react-leaflet (property-map-leaflet) |
| Graphs | recharts ^2.15 |
| Tableaux | @tanstack/react-table |
| DnD | @dnd-kit (core, sortable, utilities) |
| Éditeur | @mdxeditor/editor, react-markdown, react-syntax-highlighter |
| Thème | next-themes (darkMode class — support dark mode bien avancé d'après worklog) |

### État & données
| Rôle | Packages / fichiers |
|---|---|
| BDD | **Supabase Postgres** (85 migrations) — migration Prisma → Supabase **terminée** (0 import prisma/@prisma dans src) |
| Client Supabase | @supabase/ssr ^0.10.3 + @supabase/supabase-js ^2.106 — lib/supabase/{client,server,admin,middleware,profile,storage,email-auth,types} |
| État client | **zustand ^5** (3 stores : auth-store, notification-store, payment-alert-store) |
| Cache serveur | **@tanstack/react-query ^5** (QueryProvider staleTime 60s, gcTime 5min, retry 1) + `use-query-helpers.ts` / `use-cached-fetch.ts` |
| Formulaires | react-hook-form ^7 + @hookform/resolvers ^5 + **zod ^4** + validators.ts |
| Auth | **Supabase Auth** (email + OTP SMS via ANSUT) + session cookie custom (`resolveRequestUser` + `applyCookies`, token 30j, lib/session.ts) |

### Intégrations métier (lib/ dédiées + Edge Functions)
| Domaine | Implémentation |
|---|---|
| **Paiement** | Intouch (Orange Money, MTN MoMo, Moov Money, Wave) — `lib/intouch.ts` + Edge Functions payment-initiate/callback/transfer + routes /api/payments (initiate, callback, balance, advance, paiement-immediat, check-overdue) |
| **Signature électronique** | CRYPTONEO/ANSUT — `lib/cryptoneo.ts` + 7 routes /api/signature + 6 Edge Functions (auth, generate-certificate, sign-send-otp, sign, sign-verify, signed-file) |
| **KYC** | ONECI (NNI match, face/fingerprint auth, subscription) + NeoFace (AIneo) — routes /api/kyc/* + Edge Functions oneci-*/kyc-face-auth |
| **Messaging OTP** | ANSUT (SMS/Email) — `lib/ansut-messaging.ts` |
| **Chatbot SUTA** | Azure OpenAI (déploiement gpt-5.6-luna) — route /api/suta + suta-chatbot.tsx |
| **PDF/Docs** | generate-bail.tsx, generate-and-upload-lease-pdf.ts, generate-and-upload-mandat-pdf.ts, docx ^9 |
| **Realtime** | Supabase Realtime — **25 hooks `use-realtime-*`** (leasses, payments, messages, fraud-alerts…) |
| **Rate limit/cache** | rate-limiter.ts, response-cache.ts (serveur) |

### Mobile — Capacitor
| Élément | Valeur |
|---|---|
| Version | Capacitor **^8** (core, android, ios, cli, assets) |
| appId / appName | `com.montoit.app` / **Mon Toit** |
| webDir | `out` (⚠️ voir friction §9) |
| server | `url: https://mon-toit.ansut.ci`, androidScheme https, cleartext true, errorPath offline.html, allowNavigation ansut.ci + *.aineo.ai |
| Plugins configurés | StatusBar (overlaysWebView false, DARK), LocalNotifications (orange #F57C00), PushNotifications, App (disableBackButtonHandler), Browser, InAppBrowser, Geolocation, Network, AppLauncher |
| iOS | contentInset never, safe-area gérée dans MainViewController.swift, splash custom natif |
| Android | minSdk 26, compile/target SDK 36, permissions : INTERNET, CAMERA, RECORD_AUDIO, LOCALISATION (fine+coarse), POST_NOTIFICATIONS, FOREGROUND_SERVICE, RECEIVE_BOOT_COMPLETED… ; google-services.json optionnel (push) |
| Hooks wrap | src/hooks/capacitor/ (9 fichiers, index barrel : useNetwork, useApp, useGeolocation, useBrowser, useAppLauncher, useInAppBrowser, useStatusBar, useLocalNotifications) |

### Tests
| Élément | Valeur |
|---|---|
| Unit/intégration | **vitest ^4** (jsdom, globals, setup src/test/setup.ts avec env Supabase mockées) |
| Couverture | v8, reporters text/html/lcov ; exclus src/app/api/**, src/hooks/**, types.ts → couverture **lib + composants ciblés** |
| Fichiers tests | 10 : auth-store, middleware, dashboard, auth-flow-integration, resubmission-ui, resubmission-flow, core-actions-flow, owner-mandat-lease-flow, app-lifecycle-manager, example |
| E2E | **Playwright ^1.60** — 2 specs : `auth-flow.spec.ts` (login locataire/propriétaire), `roles.spec.ts` (switchRole 4 rôles, users seed montoit.ci) ; chromium seul, workers 1, trace/screenshot on-failure |
| ⚠️ | playwright.config : **baseURL + webServer sur port 5000** alors que le dev tourne sur 3000 en sandbox → `test:e2e` cassé en l'état |

---

## 3. Scripts npm & scripts/

| Script | Commande | Remarque |
|---|---|---|
| dev | `next dev -p 3000` | adaptation sandbox (port 5000 d'origine) |
| build | `next build && node scripts/copy-standalone-assets.mjs` | copie .next/static + public/ dans le standalone (serveur.js détecté par find) |
| start | `NODE_ENV=production node .next/standalone/server.js` | |
| lint | `eslint .` | config next core-web-vitals + typescript, règles any/unused/non-null assertion **off** |
| test / test:run / test:ui | vitest | |
| test:e2e(:headed) | playwright test | port 5000 ⚠️ |
| cap:sync / cap:open / cap:copy | npx cap … | |
| cap:build / cap:build:apk | `BUILD_TARGET=capacitor next build && npx cap copy [&& gradlew assembleDebug]` | ⚠️ BUILD_TARGET ne change rien dans next.config (§9) |
| db:push | echo no-op | DB externe Supabase |

`scripts/` : copy-standalone-assets.mjs (utilitaire build) + 12 scripts data : seed-complete, seed-user-properties, seed-owner-properties, seed-ratings, seed-more-cities, seed-inventory-video, create-test-users, cleanup-seed-data, cleanup-all-data, inspect-db, test-full-flow.

---

## 4. CI/CD & déploiement

| Fichier | Présent | Contenu clé |
|---|---|---|
| .github/workflows | **NON** | aucun pipeline CI |
| Dockerfile / vercel.json / docker-compose | **NON** | |
| ecosystem.config.js (PM2) | OUI | app `montoit` → .next/standalone/server.js, **PORT 5000**, NODE_ENV production |
| Caddyfile | OUI | `:81` → reverse_proxy **localhost:3000** (+ transform `?XTransformPort=` pour proxyfier un port arbitraire) |
| .zscripts/ | OUI (runtime sandbox) | dev.sh, build.sh, mini-services-*, python-runtime-build.sh |
| Déploiement réel | implicite | build standalone + PM2 derrière Caddy ; app mobile pointe vers https://mon-toit.ansut.ci |

⚠️ Incohérence de ports : Caddy proxifie 3000 (dev), PM2 écoute sur 5000 (prod) — cohérent si deux environnements, mais rien ne documente le mapping.

---

## 5. i18n — next-intl réellement utilisé ?

**NON.** `next-intl ^4.3.4` est dans package.json mais :
- `grep next-intl src/` → **0 match**
- pas de dossier `messages/`, `src/i18n/`, `locales/`
- aucun `useLocale` / `NextIntlClientProvider`

L'app est **100 % française en dur** (metadata FR, textes FR dans les composants). Dead dependency.

## 6. Autres dead dependencies détectées
| Package | Usage constaté |
|---|---|
| next-auth ^4.24.11 | **0 import** dans src (auth = Supabase + session custom) |
| images.unsplash.com remotePatterns | 0 référence "unsplash" dans src |
| tailwind.config.ts | style v3 (content `./pages`, `./components`, `./app` — chemins invalides à la racine) alors que le projet compile via **Tailwind v4/PostCSS** → très probablement ignoré (tw-animate-css importé dans globals.css ?) |

---

## 7. Variables d'environnement

### .env.local.example (9 groupes, 34 variables)
| Groupe | Variables | Usage (grep src + supabase/functions) |
|---|---|---|
| **Supabase** | NEXT_PUBLIC_SUPABASE_URL (38 usages), NEXT_PUBLIC_SUPABASE_ANON_KEY (13), SUPABASE_SERVICE_ROLE_KEY (3) | clients browser/server/admin, middleware |
| **CRYPTONEO** | CRYPTONEO_API_URL, APP_KEY, APP_SECRET | signature électronique (lib + Edge Functions) |
| **RNPP** | RNPP_API_BASE, RNPP_API_KEY | KYC identité |
| **NeoFace** | NEOFACE_API_BASE, NEOFACE_BEARER_TOKEN | KYC facial (allowNavigation *.aineo.ai côté mobile) |
| **Intouch** | BASE_URL, USERNAME, PASSWORD, PARTNER_ID, LOGIN_API, API_PASSWORD, CALLBACK_URL, CALLBACK_SECRET, PAIEMENT_IMMEDIAT_URL, WAVE_RETURN_URL, WAVE_CANCEL_URL, PUBLIC_APP_URL | paiements Mobile Money |
| **ANSUT** | API_BASE_URL, API_USERNAME, API_PASSWORD, SMS_SENDER | OTP SMS/Email + notifications |
| **Azure OpenAI** | ENDPOINT, API_KEY, DEPLOYMENT_NAME, API_VERSION | chatbot SUTA (server-side only) |

### ⚠️ Variables lues dans le code mais ABSENTES de .env.local.example
| Variable | Fichiers | Défaut probable |
|---|---|---|
| `OTP_EXPIRY_MINUTES` | 4 fichiers (auth OTP) | défaut codé |
| `OTP_HASH_PEPPER` | otp-hash.ts, email-auth.ts | ⚠️ sensible |
| `PAYMENT_CALLBACK_SECRET` | payments/callback | ⚠️ sécurité callback |
| `NEXT_PUBLIC_APP_URL` | intouch.ts (URLs de retour) | |
| `NEXT_PUBLIC_CAPACITOR_API_URL` | lib/capacitor.ts (base URL API du build mobile) | |

État sandbox : `.env.local` existe (créé depuis l'exemple, credentials à remplir) ; `.env` contient un vestige Prisma `DATABASE_URL=file:/home/z/my-project/db/custom.db` (mort).

---

## 8. Tests — couverture apparente
- **Unit/intégration (vitest)** : stores d'auth, middleware (rôles/permissions), rendu dashboard, flux resoumission de dossiers, flux owner-mandat-lease, lifecycle manager. Cible surtout **lib/ + logique métier** ; API routes et 25 hooks realtime **exclus** de la couverture.
- **E2E (Playwright)** : login + navigation dashboard, changement de rôle (locataire → propriétaire → TC → admin) avec utilisateurs seed (`*@montoit.ci` / `Test1234!`).
- **Seed** : scripts dédiés + route `/api/seed` ; rapport e2e dans `e2e-report/` (généré).

---

## 9. Points de friction / risques structurants

| # | Sévérité | Constat |
|---|---|---|
| 1 | 🔴 **Majeur** | **SPA monolithique** : toute l'UX (accueil + 5 dashboards ~100 vues) est rendue dans `src/app/page.tsx` `'use client'`. Pas de routes App Router → bundle client géant, pas de code-splitting par route, SEO appauvri (le contenu n'est pas SSR), arbre d'imports gigantesque à maintenir dans dashboard/index.tsx. |
| 2 | 🔴 Majeur | **Capacitor build incohérent** : `webDir: 'out'` + `BUILD_TARGET=capacitor` dans cap:build, mais next.config **ne bascule jamais sur `output: 'export'`** (variable `isCapacitorBuild` calculée puis jamais utilisée). Le build "cap" produit un standalone inutilisable en static. En pratique l'app charge l'URL distante (`server.url`), le webDir est décoratif — fragile. |
| 3 | 🟠 Élevé | **Dead dependencies** : next-intl (i18n inexistant), next-auth (remplacé par Supabase Auth). Poids install + confusion pour les nouveaux devs. |
| 4 | 🟠 Élevé | **Configuration Tailwind ambiguë** : tailwind.config.ts v3-style avec `content` pointant vers des dossiers inexistants (`./pages`, `./components`, `./app`) alors que le projet utilise Tailwind v4 via `@tailwindcss/postcss`. À purger ou documenter (thème tokens en globals.css). |
| 5 | 🟠 Élevé | **Ports incohérents** : dev/Caddy = 3000 ; Playwright (baseURL + webServer) et PM2 (PORT) = 5000. `test:e2e` échoue en sandbox sans adaptation. |
| 6 | 🟠 Élevé | **Duplication logique serveur** : la même logique métier existe dans `src/lib/*` (Next) **et** `supabase/functions/_shared/*` (Deno) — cryptoneo, intouch, oneci, ansut-messaging, notify sont des ports manuels. 12 routes Next sont des purs proxy vers Edge Functions. Risque de divergence à chaque évolution. |
| 7 | 🟡 Moyen | **Env example incomplète** : OTP_EXPIRY_MINUTES, OTP_HASH_PEPPER, PAYMENT_CALLBACK_SECRET, NEXT_PUBLIC_APP_URL, NEXT_PUBLIC_CAPACITOR_API_URL utilisées dans le code mais absentes de .env.local.example (risque d'oubli de config en déploiement). |
| 8 | 🟡 Moyen | **Orphelins** : `db/custom.db` + `.env` DATABASE_URL Prisma legacy ; 8 sous-dossiers vides dans src/hooks (agency, auth, contract, messaging, native, property, shared, tenant) ; src/lib/{constants,helpers} vides ; AGENTS.md disparu (mentionné au worklog Sprint 4). |
| 9 | 🟡 Moyen | **Deux lockfiles** : bun.lock (440 Ko) + package-lock.json (755 Ko) → risque de dérive de versions selon le gestionnaire utilisé. |
| 10 | 🟡 Moyen | **Zéro CI** : pas de .github/workflows — ni lint, ni tests, ni tsc vérifiés avant push, alors que le projet a vitest + playwright + eslint prêts à l'emploi. |
| 11 | 🟢 Mineur | `middleware.ts` matcher très large (`/((?!_next/static...).*)`) → Supabase auth.getUser() appelé sur chaque requête (perf edge) ; reactStrictMode désactivé ; `noImplicitAny: false` affaiblit strict. |
| 12 | 🟢 Mineur | Fichiers utilitaires à la racine de src/lib sans sous-domaines clairs (session.ts + session-constants.ts + auth/request-user.ts = 3 couches de session). |

---

## 10. Synthèse
Le projet est un **Next.js 16 / React 19 full-TypeScript** pensé **mobile-first** (Capacitor 8 iOS+Android, 11 plugins, splash natif custom) avec **Supabase** comme backend unique (Postgres 85 migrations, Auth, Realtime 25 hooks, Storage, 25 Edge Functions Deno). La couche UI est **shadcn/ui new-york (53 composants) + Tailwind v4 + Radix**, l'état client **zustand (3 stores) + TanStack Query**. Les intégrations ivoiriennes sont complètes : Intouch (paiements), CRYPTONEO (signature), ONECI/NeoFace/RNPP (KYC), ANSUT (SMS/OTP), Azure OpenAI (chatbot SUTA). Le point architectural dominant — et le principal levier d'amélioration — est le choix **SPA mono-page** (1 page cliente + 162 routes API), conjointement avec un build Capacitor à clarifier et des dépendances mortes à retirer.
