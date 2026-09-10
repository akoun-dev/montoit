-- No admin screen/route was dedicated to moderating ratings: abusive
-- reviews had no status to flip and no link back to the signalements
-- raised against them. Add a moderation status to ratings and let an
-- admin decision resolve the signalements it was based on.

alter table ratings
  add column if not exists status text not null default 'PUBLISHED',
  add column if not exists moderated_at timestamptz,
  add column if not exists moderated_by_id text references users(id) on delete set null,
  add column if not exists moderation_reason text;

alter table ratings
  drop constraint if exists ratings_status_check;
alter table ratings
  add constraint ratings_status_check check (status in ('PUBLISHED', 'HIDDEN'));

create index if not exists idx_ratings_status on ratings (status);
