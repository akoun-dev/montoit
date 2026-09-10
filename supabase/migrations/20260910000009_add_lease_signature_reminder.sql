-- Nothing ever nudged a lease stuck in PENDING_SIGNATURE — a party who
-- forgot to sign had no way to be reminded, and the analysis flagged this
-- as a P0 gap ("Baux pouvant rester bloqués"). Track the last reminder sent
-- so the scheduled job (remind-pending-lease-signatures Edge Function) can
-- notify the missing signatory periodically without spamming on every run.
alter table leases
  add column if not exists reminder_sent_at timestamptz;
