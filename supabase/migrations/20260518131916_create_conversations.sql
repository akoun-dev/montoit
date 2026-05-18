-- 016_conversations.sql
-- Messaging conversations between two users, optionally linked to a property.

create table if not exists conversations (
  id              text        primary key,
  last_message_at timestamptz,
  created_at      timestamptz not null default now(),
  property_id     text        references properties(id) on delete set null,
  participant1_id text        not null references users(id) on delete cascade,
  participant2_id text        not null references users(id) on delete cascade
);

create index if not exists idx_conversations_participants on conversations (participant1_id, participant2_id);
create index if not exists idx_conversations_property_id on conversations (property_id);
create index if not exists idx_conversations_last_message_at on conversations (last_message_at);

alter table conversations enable row level security;

-- rls policies for conversations
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "conversations_select_participant"
  on conversations for select
  to authenticated
  using (
    (select auth.uid()::text) in (participant1_id, participant2_id)
  );

create policy "conversations_insert_auth"
  on conversations for insert
  to authenticated
  with check (
    (select auth.uid()::text) in (participant1_id, participant2_id)
  );

create policy "conversations_update_participant"
  on conversations for update
  to authenticated
  using (
    (select auth.uid()::text) in (participant1_id, participant2_id)
  )
  with check (
    (select auth.uid()::text) in (participant1_id, participant2_id)
  );
