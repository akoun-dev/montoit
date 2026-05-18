-- 034_agent_feedback.sql
-- Feedback from Tiers de Confiance on verification agent performance.

create table if not exists agent_feedback (
  id        text        primary key,
  rating    integer     not null,
  comment   text,
  created_at timestamptz not null default now(),
  agent_id  text        not null references verification_agents(id) on delete cascade,
  tc_id     text        not null references users(id) on delete cascade
);

create index if not exists idx_agent_feedback_agent_id on agent_feedback (agent_id);
create index if not exists idx_agent_feedback_tc_id on agent_feedback (tc_id);

alter table agent_feedback enable row level security;

-- rls policies for agent feedback
-- these policies are colocated with the table migration so the security model
-- is defined at the same time as the underlying table structure.

create policy "agent_feedback_select_tc"
  on agent_feedback for select
  to authenticated
  using (
    exists (select 1 from users where id = (select auth.uid()::text) and role in ('TIERS_CONFIANCE', 'ADMIN'))
  );

create policy "agent_feedback_insert_tc"
  on agent_feedback for insert
  to authenticated
  with check ((select auth.uid()::text) = tc_id);
