# TEAM_STATUS — Mon Toit CI (branche 4.0.0)

**Dernière mise à jour** : 2026-10-27 — Phase en cours : **WAVE 3 TERMINÉE + QA VALIDÉE → restent 4 tâches E2E/juridique + FE-003 continu**

## État du système multi-agents
| Agent | Statut | Dernière contribution |
|-------|--------|----------------------|
| 🧠 ORCHESTRATEUR (CTO/PO) | 🟢 Actif | Wave 3 (7 agents) exécutée et validée QA ; backlog 48/54 Validé |
| 🏗️ AGENT 1 — Tech Lead & Architecte | 🟢 Actif | Séparation par acteur respectée (missions/ dédié AGENT_TERRAIN, tc/ dédié TC) |
| 🧪 AGENT 2 — Chef de projet / QA | 🟢 Actif | QA wave 3 : tsc 0 erreur, lint clean nouveau code, vitest 44/44, smoke /m/ 404 gracieuse |
| 🔒 DEV SECURITÉ | ✅ Wave 3 | S3-Edge fail-closed + verify_jwt, 9 colonnes KYC gardées, rate-limits ONECI, purge tool-results |
| 📦 DEV BACKEND | ✅ Wave 3 | TC-003 + TC-005 (routes token, notification, draft inventory_reports, evidence signée) |
| 🎨 DEV FRONTEND | ✅ Wave 3 | TC-004 (/m/[token] 7 états a11y) + TC-006 (badges token) + FUN-002 (badges type) |
| 💾 DEV FULLSTACK/DATA | ✅ Wave 3 | Migrations 20261027000050/60 (trigger users, bucket mission-evidence) |
| ⚙️ DEVOPS | ✅ Wave 3 | TS réparé, 6 getPublicUrl→signed URLs, 40 fichiers secrets désindexés |
| 📝 AGENT DOCUMENTATION | ⚪ Disponible | DOC-003 (revue juridique mentions quittance) — À faire |
| 🔍 AGENT REVIEWER | 🟢 Actif | Rapports 6-a..6-g relus ; contrats d'API documentés |
| ♿ A11Y / ⚡ PERF / 🕵️ AUDIT GLOBAL | ⚪ En veille | Re-scan périodique requis post-wave 3 |

## Backlog (55 tâches) : **48 Validé · 1 En revue · 1 En cours · 4 À faire**
- **En revue (1)** : SEC-005 — purge git OK (40 fichiers), **rotation clés ONECI = action externe** (runbook docs/RUNBOOK-ROTATION-SECRETS.md)
- **En cours (1)** : FE-003 — unification data-layer (pattern pilote + services TC créés ; adoption écran par écran, règle boy-scout)
- **À faire (4)** : TC-007 (QA E2E agent terrain), FUN-007 (QA E2E quittances), FUN-012 (QA concurrence multi-dossiers), DOC-003 (revue juridique)
- ⚠️ Les 4 tâches E2E exigent un **Supabase configuré** (credentials réels dans .env.local) + migrations appliquées

## QA wave 3 (gates franchis)
| Gate | Résultat |
|------|----------|
| `tsc --noEmit` (4 Go heap) | ✅ 0 erreur sur tout le projet |
| `bun run lint` | ✅ 0 erreur/0 warning sur le code wave 3 (176 problèmes = legacy sandbox, dette FE-002) |
| `vitest` number-to-words | ✅ 44/44 verts (bug linguistique 180 000 corrigé au passage) |
| Smoke navigateur | ✅ `/` HTTP 200 ; `/m/fake-token` → 404 JSON conforme + écran « Mission introuvable » gracieux |
| Runtime dev.log | ✅ aucune erreur |

## Corrections notables wave 3
1. **S3-Edge (dernier P0)** : Edge payment-callback fail-closed (503 sans secret), GET→405, HMAC corps brut timing-safe, verify_jwt=true + proxy Bearer service_role.
2. **SEC-011** : self-claim KYC via REST bloqué (trigger étendu à 9 colonnes : nni, oneci_verified(+at), neoface_verified(+at), kyc_document_id, is_email_verified, is_phone_verified, password_hash).
3. **SEC-013** : tool-results/ désindexé (40 fichiers avec secrets) + .gitignore.
4. **Bug 180 000** : « cent-quatre-vingts-mille » → « cent-quatre-vingt-mille » (rectification 1990).
5. **Numérotation quittances** : fallback aléatoire supprimé → fail-closed 503 + retry 23505 (max 3).
6. **eslint.config.js legacy supprimé** (éclipsait le .mjs du push, plugin react-hooks v7 enregistré).

## Actions externes requises (hors code)
1. **Rotation des clés ONECI/RNPP** (runbook prêt) — les secrets sont purgés du working tree et de l'index git mais restent dans l'**historique distant** → purge BFG côté repo + rotation.
2. **Déploiement Supabase** : appliquer les 17 migrations locales (15 × 20261027*, + bucket mission-evidence), configurer MISSION_TOKEN_PEPPER, PAYMENT_CALLBACK_SECRET = INTOUCH_CALLBACK_SECRET, push des 43 Edge Functions locales.
3. **Pousser le travail Sprint vers origin/4.0.0** (le repo distant ne contient aucun des travaux SEC/FUN/TC/INF).

## Prochaine étape
**Wave 4 (légère)** : TC-007 + FUN-007 + FUN-012 (E2E, bloquées par Supabase) + DOC-003 (juridique, faisable sans Supabase) + FE-003 boy-scout. Puis AUDIT GLOBAL périodique.
