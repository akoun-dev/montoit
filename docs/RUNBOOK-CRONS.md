# RUNBOOK — Crons des Edge Functions (DAT-002)

> **Source de vérité des horaires** : `supabase/config.toml` (section
> `[functions.*]`, commentaires `schedule pg_cron`) + ce document.
> Les 8 fonctions planifiées vérifient elles-mêmes le header
> `Authorization: Bearer $CRON_SECRET` (le gateway Supabase n'applique pas de
> JWT pour ces fonctions : `verify_jwt = false`, requis pour pg_net).

## 1. Fuseau horaire

- Tous les schedules cron sont exprimés en **UTC**.
- La Côte d'Ivoire est en **GMT/UTC+0 toute l'année** (pas d'heure d'été) :
  « 08:00 UTC » = « 08:00 à Abidjan », sans conversion saisonnière.
- Ne JAMAIS écrire un schedule en heure locale dans pg_cron (`cron.schedule`
  travaille en UTC sur Supabase).

## 2. Tableau des crons

| Fonction | Schedule (cron, UTC) | Fuseau | Effet | Idempotence | Runbook de reprise |
|---|---|---|---|---|---|
| `generate-monthly-payments` | `0 0 1 * *` (1er du mois 00:00) | UTC | Crée les paiements `PENDING` du mois pour les baux `ACTIVE` (due_date = 5 du mois) | Index unique partiel `(lease_id, due_date) WHERE reference IS NULL` + check amont (23505 avalée) | §5.1 — relancer manuellement ; les doublons sont rejetés en base |
| `check-overdue-payments` | `30 8 * * *` (quotidien 08:30) | UTC | Bascule `PENDING` → `LATE` (due_date dépassée) + notifications locataire/propriétaire | Claim atomique (UPDATE … RETURNING), une seule exécution marque chaque paiement | §5.2 — relance sûre, ne re-notifie pas les paiements déjà `LATE` |
| `remind-upcoming-payments` | `0 8 * * *` (quotidien 08:00) | UTC | Rappels J-3 / J-1 avant échéance (respecte `notification_preferences.payment_alerts`) | Colonnes `payments.reminder_3d_sent_at` / `reminder_1d_sent_at` (1 envoi max par seuil) | §5.3 — relance sûre |
| `remind-upcoming-visits` | `0 8 * * *` (quotidien 08:00) | UTC | Rappel J-1 des visites à venir (respecte `visit_reminders`) ; agents d'agence sans compte → SMS/email ANSUT | `visit_requests.reminder_sent_at` (1 envoi) | §5.3 — relance sûre |
| `remind-lease-expiring` | `0 8 * * *` (quotidien 08:00) | UTC | Rappel J-60 avant `leases.end_date` (proposition de renouvellement) | `leases.renewal_reminder_sent_at` (1 envoi) | §5.3 — relance sûre |
| `remind-pending-lease-signatures` | `0 8 * * *` (quotidien 08:00) | UTC | Relance des baux bloqués en `PENDING_SIGNATURE` (chaque 48 h) | `leases.reminder_sent_at` (fenêtre 48 h) | §5.3 — relance sûre |
| `expire-stale-listings` | `30 0 * * *` (quotidien 00:30) | UTC | Annonces `ACTIVE` dont `listing_expires_at` (90 j, trigger) est dépassé → `SUSPENDED` + notif propriétaire | Transition d'état (déjà SUSPENDED = no-op) | §5.4 — relance sûre |
| `expire-stale-rental-files` | `30 0 * * *` (quotidien 00:30) | UTC | Dossiers `VALIDATED` au-delà de `valid_until` → `EXPIRED` ; candidatures non finalisées → `EXPIRED` | Transition d'état | §5.4 — relance sûre |

**Fonctions déclenchées par événement (PAS des crons — à ne pas planifier)** :
`payment-initiate`, `payment-callback` (webhook Intouch signé), `payment-transfer`,
`signature-auth`, `generate-certificate`, `sign-send-otp`, `sign`, `sign-verify`,
`signed-file`, `check-certificate`, `retrieve-certificates`, `kyc-face-auth`,
`oneci-match`, `oneci-face-auth`, `oneci-fingerprint-auth`, `oneci-person`,
`oneci-subscription` (+ `_test`, à supprimer).

> Note : les consignes du sprint mentionnaient « 11 EF planifiées » ; le
> décompte réel dans `supabase/functions/` est **8** (4 `remind-*`,
> 2 `expire-*`, `check-overdue-payments`, `generate-monthly-payments`).

## 3. Activation sur le projet hébergé (pg_cron + pg_net)

Les migrations sont interdites au sprint 1 (périmètre) : le SQL ci-dessous est
**prêt à l'emploi** et à poser via le SQL Editor du dashboard Supabase (ou une
migration dédiée quand le périmètre le permettra). Extensions requises ( déjà
disponibles sur Supabase) : `pg_cron`, `pg_net`.

```sql
-- 0. Secrets — stocker CRON_SECRET dans Vault (jamais en clair dans le SQL) :
select vault.create_secret('<CRON_SECRET>', 'cron_secret');

-- 1. Extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- 2. Helper : schedule d'une fonction Edge (URL du projet + secret Vault)
create or replace function schedule_edge_function(
  p_job_name text, p_cron text, p_function_name text
) returns void language plpgsql as $$
declare
  v_url  text := 'https://<PROJECT_REF>.supabase.co/functions/v1/' || p_function_name;
  v_secret text := (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret' limit 1);
begin
  perform cron.unschedule(p_job_name);
  perform cron.schedule(
    p_job_name, p_cron,
    $f$select net.http_post(
        url := $url$,
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || '$secret$'
        ),
        body := '{}'::jsonb
      )$f$
  );
end $$;
```

> Simplification : la fonction helper ci-dessus doit interpoler `v_url` /
> `v_secret` ; en pratique, préférer le bloc « par fonction » ci-dessous, avec
> le secret lu depuis Vault au moment de la création du job (SQL Editor) :

```sql
-- 3. Jobs (un bloc par fonction — jobname stable pour l'unschedule)
select cron.schedule('mnt-generate-monthly-payments',       '0 0 1 * *', $$ select net.http_post(url := 'https://<PROJECT_REF>.supabase.co/functions/v1/generate-monthly-payments', headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='cron_secret' limit 1)), body := '{}'::jsonb) $$);
select cron.schedule('mnt-check-overdue-payments',          '30 8 * * *', $$ select net.http_post(url := 'https://<PROJECT_REF>.supabase.co/functions/v1/check-overdue-payments', headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='cron_secret' limit 1)), body := '{}'::jsonb) $$);
select cron.schedule('mnt-remind-upcoming-payments',        '0 8 * * *',  $$ select net.http_post(url := 'https://<PROJECT_REF>.supabase.co/functions/v1/remind-upcoming-payments', headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='cron_secret' limit 1)), body := '{}'::jsonb) $$);
select cron.schedule('mnt-remind-upcoming-visits',          '0 8 * * *',  $$ select net.http_post(url := 'https://<PROJECT_REF>.supabase.co/functions/v1/remind-upcoming-visits', headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='cron_secret' limit 1)), body := '{}'::jsonb) $$);
select cron.schedule('mnt-remind-lease-expiring',           '0 8 * * *',  $$ select net.http_post(url := 'https://<PROJECT_REF>.supabase.co/functions/v1/remind-lease-expiring', headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='cron_secret' limit 1)), body := '{}'::jsonb) $$);
select cron.schedule('mnt-remind-pending-lease-signatures', '0 8 * * *',  $$ select net.http_post(url := 'https://<PROJECT_REF>.supabase.co/functions/v1/remind-pending-lease-signatures', headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='cron_secret' limit 1)), body := '{}'::jsonb) $$);
select cron.schedule('mnt-expire-stale-listings',           '30 0 * * *', $$ select net.http_post(url := 'https://<PROJECT_REF>.supabase.co/functions/v1/expire-stale-listings', headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='cron_secret' limit 1)), body := '{}'::jsonb) $$);
select cron.schedule('mnt-expire-stale-rental-files',       '30 0 * * *', $$ select net.http_post(url := 'https://<PROJECT_REF>.supabase.co/functions/v1/expire-stale-rental-files', headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='cron_secret' limit 1)), body := '{}'::jsonb) $$);
```

## 4. Vérification / supervision

```sql
-- Jobs programmés
select jobname, schedule, active from cron.job order by jobname;

-- Historique d'exécution (statut HTTP, durée)
select j.jobname, r.start_time, r.status, r.return_message
from cron.job_run_details r join cron.job j on j.jobid = r.jobid
order by r.start_time desc limit 50;
```

Point d'attention pg_net : l'appel est **asynchrone** — `return_message`
contient le statut HTTP de la requête lancée, pas de la réponse de la fonction.
Pour un contrôle de bout en bout, utiliser l'appel manuel (§5) et vérifier les
logs Edge (`supabase functions logs <nom>` / dashboard).

## 5. Procédures de reprise

Invocation manuelle (à privilégier après incident) :

```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/functions/v1/<FUNCTION>" \
  -H "Authorization: Bearer $CRON_SECRET" -H "Content-Type: application/json" -d '{}'
```

### 5.1 `generate-monthly-payments` manqué (ex. le 1er à 00:00)
1. Vérifier la cause : `cron.job_run_details` (statut ≠ 200), logs Edge, solde
   d'appels, déploiement de la fonction.
2. Relancer **manuellement** l'appel curl ci-dessus — l'idempotence (index
   unique partiel) empêche les doublons ; les paiements déjà créés sont ignorés
   (23505).
3. Si le mois est déjà avancé et que les due_date (5 du mois) sont passées :
   créer les paiements manquants via un backfill SQL dédié (à faire valider par
   l'équipe data) puis marquer `LATE` via `check-overdue-payments`.

### 5.2 `check-overdue-payments` en échec répété
- Claim atomique : la relance ne re-marque pas les paiements déjà `LATE`.
- Si le blocage vient des notifications (ANSUT down), les paiements restent
  marqués `LATE` (transaction par paiement) ; seuls les rappels seront absents.

### 5.3 Rappels (`remind-*`) en échec
- Idempotents par colonnes `*_sent_at` : une relance manuelle ne spamme pas.
- Si ANSUT est indisponible plusieurs jours (SMS/email), les rappels J-3 d'un
  paiement déjà passé ne se rattrapent pas (seuil J-3/J-1 dépassé) — acceptable ;
  les notifications in-app (`notifications`) sont créées par la même exécution.

### 5.4 Expirations (`expire-*`) en échec
- Relance manuelle sans risque (transitions d'état uniquement).
- Les annonces restées `ACTIVE` au-delà de 90 j pendant un incident sont
  rattrapées à la première exécution suivante.

### 5.5 Rotation de `CRON_SECRET`
1. Nouveau secret → `vault.create_secret` (nouveau nom) + mise à jour des jobs
   (`cron.unschedule` + `cron.schedule` du §3) + secret Edge `CRON_SECRET`
   (`supabase secrets set CRON_SECRET=…`).
2. ⚠️ Constat sécurité (rapport 1-c) : les 8 fonctions sont **fail-open** —
   si `CRON_SECRET` n'est pas défini dans l'environnement Edge, l'endpoint est
   appelable sans authentification. Vérifier le secret après chaque déploiement
   (`supabase secrets list`).
