-- Two real data-exposure bugs, flagged by the analysis but never fixed:
--
-- 1. service_usage_logs and facial_verifications each carry an "own
--    records" SELECT policy and a "trust agents" SELECT policy, but BOTH
--    were written as `USING (true)` — meaning any authenticated user could
--    read every row of either table, including facial_verifications'
--    selfie_url and biometric matching scores for every user on the
--    platform, and service_usage_logs' KYC provider metadata for everyone.
--    Fix each policy to actually check what its name promises.
--
-- 2. service_usage_logs.user_id is `uuid` while every other user reference
--    in this schema (users.id, and the FK on facial_verifications.user_id)
--    is `text` — so it was never actually constrained to a real user, and
--    an insert with a non-UUID-shaped id would fail. Repoint it to match.

alter table service_usage_logs
  alter column user_id type text using user_id::text;

alter table service_usage_logs
  add constraint service_usage_logs_user_id_fkey
  foreign key (user_id) references users(id) on delete set null;

drop policy if exists "Users can view own logs" on service_usage_logs;
create policy "Users can view own logs" on service_usage_logs
  for select to authenticated
  using ((select auth.uid()::text) = user_id);

drop policy if exists "Trust agents can view all logs" on service_usage_logs;
create policy "Trust agents can view all logs" on service_usage_logs
  for select to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );

drop policy if exists "Users can view own verifications" on facial_verifications;
create policy "Users can view own verifications" on facial_verifications
  for select to authenticated
  using ((select auth.uid()::text) = user_id);

drop policy if exists "Trust agents can view all verifications" on facial_verifications;
create policy "Trust agents can view all verifications" on facial_verifications
  for select to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );
