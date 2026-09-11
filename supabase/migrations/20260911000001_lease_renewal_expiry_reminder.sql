-- The renewal acceptance flow (POST/PATCH /api/renewals) flipped
-- renewal_status to ACCEPTED and told the tenant "a new lease will be
-- created soon" — but nothing ever created it, and nothing proactively
-- warned either party that a lease was approaching its end date so a
-- renewal could be requested in time. Track when that expiry reminder
-- was sent so the scheduled job stays idempotent.

alter table leases
  add column if not exists renewal_reminder_sent_at timestamptz;
