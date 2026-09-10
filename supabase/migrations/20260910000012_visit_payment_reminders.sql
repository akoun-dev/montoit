-- notification_preferences.visit_reminders / payment_alerts already existed
-- as toggles, but nothing ever triggered a J-1/J-3 reminder for an upcoming
-- visit or rent due date — the preference had nothing wired to it.
-- Track when each reminder was sent so the scheduled jobs stay idempotent
-- across runs (a visit gets one J-1 reminder, a payment gets a J-3 and a
-- J-1 reminder).

alter table visit_requests
  add column if not exists reminder_sent_at timestamptz;

alter table payments
  add column if not exists reminder_3d_sent_at timestamptz,
  add column if not exists reminder_1d_sent_at timestamptz;
