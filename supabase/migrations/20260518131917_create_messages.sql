-- 017_messages.sql
-- Individual messages within a conversation.

create table if not exists messages (
  id              text        primary key,
  content         text        not null,
  is_read         boolean     not null default false,
  created_at      timestamptz not null default now(),
  conversation_id text        not null references conversations(id) on delete cascade,
  sender_id       text        not null references users(id) on delete cascade
);

create index if not exists idx_messages_conversation_id on messages (conversation_id);
create index if not exists idx_messages_sender_id on messages (sender_id);
create index if not exists idx_messages_is_read on messages (is_read);

alter table messages enable row level security;

-- rls policies for messages
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "messages_select_participant"
  on messages for select
  to authenticated
  using (
    exists (
      select 1 from conversations
      where id = conversation_id
        and (select auth.uid()::text) in (participant1_id, participant2_id)
    )
  );

create policy "messages_insert_participant"
  on messages for insert
  to authenticated
  with check (
    exists (
      select 1 from conversations
      where id = conversation_id
        and (select auth.uid()::text) in (participant1_id, participant2_id)
    )
  );

create policy "messages_update_own"
  on messages for update
  to authenticated
  using ((select auth.uid()::text) = sender_id)
  with check ((select auth.uid()::text) = sender_id);

alter publication supabase_realtime add table messages;
