# RUNBOOK — Rotation des secrets exposés (Mon Toit CI)

> **Task ID 4-a — Sprint 0 sécurité (SEC-005).**
> Statut au 2026-05 : purge effectuée dans les fichiers de travail, **la rotation réelle côté fournisseurs est HORS SANDBOX et reste À FAIRE** (actions externes listées ci-dessous).
> Règle d'or : **un secret ne doit jamais figurer dans un fichier suivi par git** (worklog, docs, `.env*` versionnés, issues…). Utiliser `.env.local` (gitignoré) ou les secrets Supabase.

---

## 1. Inventaire des secrets exposés trouvés

| # | Secret | Valeur (référence tronquée) | Où il était exposé | Criticité |
|---|--------|------------------------------|--------------------|-----------|
| 1 | `ONECI_API_KEY` (RNPP Connect / api-rnpp.verif.ci) | UUID format (`95d5eff0-…`, valeur complète dans l'historique git) | `worklog.md` § "Task ID: 3, ONECI KYC Agent" (fichier **suivi par git**, présent dans l'historique commit `85174d4`) ; référencé partiellement dans `.ai/ANALYSES/1-c-backend-api-securite.md` §V4bis ; historiquement écrit aussi dans `.env` | 🔴 Haute |
| 2 | `ONECI_SECRET_KEY` | chaîne ~14 caractères (valeur complète dans l'historique git) | Mêmes emplacements que #1 | 🔴 Haute |
| 3 | `INTOUCH_PARTNER_ID` | `CI3003…` (valeur complète dans l'historique git) | `.env.local.example` (fichier **suivi par git**) | 🟡 Faible (identifiant de compte, pas un secret) |
| 4 | `INTOUCH_LOGIN_API` | numéro de login API `070845…` (valeur complète dans l'historique git) | `.env.local.example` (fichier **suivi par git**) | 🟡 Faible (identifiant de compte) |

**Ce qui n'a PAS fuité** (vérifié par scan du repo) : `SUPABASE_SERVICE_ROLE_KEY`, `INTOUCH_API_PASSWORD`, `INTOUCH_USERNAME`, `CRYPTONEO_APP_KEY/SECRET`, `ANSUT_*`, `AZURE_OPENAI_API_KEY`, `NEOFACE_BEARER_TOKEN` — aucun en clair dans le code, les docs ou l'historique visible. `.env.local` (gitignoré) est le bon emplacement.

## 2. Purge effectuée dans le repo (Task 4-a)

- `worklog.md` : valeurs #1 et #2 remplacées par `[REDACTÉ — rotation requise, voir docs/RUNBOOK-ROTATION-SECRETS.md]`.
- `.ai/ANALYSES/1-c-backend-api-securite.md` : valeur #2 (citée en clair dans l'analyse) remplacée par `[REDACTÉ…]`.
- `.env.local.example` : valeurs #3 et #4 vidées par 4-a, puis **réintroduites par un agent parallèle** qui documente le fichier comme « valeurs par défaut du code » — en effet `src/lib/intouch.ts` (l. 12-13) et `supabase/functions/_shared/*` contiennent ces identifiants en dur. Décision respectée (non-secrets au sens strict), MAIS l'exposition reste listée au §3.2 : paramétrer le code et faire ré-émettre les identifiants par Intouch reste recommandé.

⚠️ **La purge des fichiers ne suffit pas** : les valeurs restent dans l'historique git (commit `85174d4` au minimum, branche 4.0.0). Voir §3.

## 3. Rotation requise — procédures par secret

### 3.1 Clés RNPP Connect / ONECI (API KYC, api-rnpp.verif.ci) — 🔴 priorité immédiate

1. **Contacter** : support RNPP Connect / ONECI (partenaire KYC) — demande de révocation + réémission du couple API key/secret. Escalade : responsable du partenariat ONECI côté projet.
2. **Révoquer** : faire désactiver la clé `95d5eff0-…` et le secret associé côté fournisseur (supposer qu'ils sont compromis : ils sont dans l'historique git).
3. **Réémettre** : obtenir un nouveau couple clé/secret via un canal privé (pas d'email/worklog).
4. **Mettre à jour** :
   - `.env.local` (gitignoré) : `RNPP_API_KEY` (naming actuel ; l'ancien `ONECI_API_KEY`/`ONECI_SECRET_KEY` n'est plus utilisé par le code) ;
   - secrets Supabase des Edge Functions qui consomment RNPP/ONECI : `supabase secrets set RNPP_API_KEY=…` (ou Dashboard → Edge Functions → Secrets) ;
   - variables d'environnement de production (hébergeur Next : Dashboard → Environment Variables).
5. **Vérifier** : un appel KYC réel passe, l'ancienne clé est rejetée (401 du fournisseur).
6. **Purger l'historique git** si le repo est partagé : `git filter-repo --replace-text` (ou BFG Repo-Cleaner) sur `worklog.md` + `.env.local.example`, puis force-push et re-clone de l'équipe. Si le repo est strictement privé et l'historique conservé, la rotation des clés reste obligatoire.

### 3.2 Identifiants de compte Intouch (gutouch) — 🟡 recommandé

1. **Contacter** : account manager Intouch / gutouch (paiements Mobile Money CI).
2. Demander si la paire identifiant (`CI3003…` / login `070845…`) exposée justifie une **ré-émission des credentials API** (le mot de passe API `INTOUCH_API_PASSWORD` n'a pas fuité, mais les identifiants de login sont désormais connus → facilitent targeted phishing / brute force).
3. Mettre à jour `.env.local` + secrets de production + `supabase secrets set` pour les Edge Functions `payment-*`.
4. En profiter pour générer un **nouveau `PAYMENT_CALLBACK_SECRET`** (fort, ≥ 32 octets aléatoires) et le partager à Intouch pour la signature HMAC du webhook (voir §4).

### 3.3 Bonne pratique post-rotation

- Consigner les rotations (date, ticket, nouvel ID de clé — jamais la valeur) dans un gestionnaire de secrets (1Password/Vault/Supabase Dashboard).
- Ajouter au CI un scan anti-secrets (gitleaks/trufflehog) pour bloquer tout commit contenant des clés.
- Préfixer toute note interne par : « pas de secrets dans les logs/worklogs ».

## 4. Actions de déploiement liées au Sprint 0 (rappel SEC-003)

- Définir `PAYMENT_CALLBACK_SECRET` dans `.env.local` **et** sur l'environnement de production Next : **sans cette variable, la route `/api/payments/callback` répond 503 et aucun callback Intouch n'est traité** (fail-closed voulu).
- Coordination Intouch requise : le webhook doit envoyer l'en-tête `x-webhook-signature: <HMAC-SHA256 hex du corps brut>` (préfixe optionnel `sha256=`). À vérifier avec l'intégration Intouch ; à défaut, prévoir un relais signé.
- **Reste à faire hors périmètre 4-a** (Edge Functions, agent migrations/config) : la fonction `payment-callback` (supabase/functions) est toujours fail-open (`INTOUCH_CALLBACK_SECRET` optionnel + GET accepté) — à durcir dans le même esprit que la route Next.

## 5. Checklist finale

- [ ] Clés RNPP/ONECI révoquées + réémises (fournisseur)
- [ ] Nouvelles clés dans `.env.local` + Supabase secrets + hébergeur
- [ ] Historique git purgé (filter-repo/BFG) si repo partagé
- [ ] Identifiants Intouch re-vérifiés / re-émis
- [ ] `PAYMENT_CALLBACK_SECRET` défini en dev + prod (webhook opérationnel)
- [ ] Scan anti-secrets ajouté au CI

## 🚨 Incident 2026-10-27 — Perte des secrets locaux (.env.local)
Pendant le Sprint 0 (SEC-005), le fichier `.env.local` a été vidé de ses valeurs par erreur.
**Récupéré** : config URLs, credentials Intouch (défauts code), URL projet Supabase.
**Générés** : OTP_HASH_PEPPER, CRON_SECRET, PAYMENT_CALLBACK_SECRET.
**Perdus — ACTION REQUISE** :
1. Supabase (bloquant) : ré-obtenir `NEXT_PUBLIC_SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` (Dashboard → Settings → API) — ou ré-émettre via CLI.
2. Fournisseurs externes : CRYPTONEO, RNPP, NeoFace, ANSUT, Azure OpenAI, mots de passe Intouch.
Règle nouvelle : `.env.local` jamais lu/modifié par les agents (orchestrateur exclusif).
