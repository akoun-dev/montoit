-- Migration: Create message_attachments table and storage bucket

-- 1. Create the message_attachments table
create table message_attachments (
  id          text        primary key,
  message_id  text        not null references messages(id) on delete cascade,
  file_name   text        not null,
  file_type   text        not null,
  file_size   integer     not null,
  url         text        not null,
  created_at  timestamptz not null default now()
);

-- Index for fast lookup by message
create index idx_message_attachments_message_id on message_attachments(message_id);

-- Enable RLS
alter table message_attachments enable row level security;

-- RLS: participants can view attachments of their conversation messages
create policy "Participants can view message attachments"
  on message_attachments
  for select
  using (
    exists (
      select 1 from messages m
      join conversations c on c.id = m.conversation_id
      where m.id = message_id
      and (c.participant1_id = auth.uid()::text or c.participant2_id = auth.uid()::text)
    )
  );

-- RLS: authenticated users can insert attachments for their own messages
create policy "Users can insert attachments for their messages"
  on message_attachments
  for insert
  with check (
    exists (
      select 1 from messages
      where messages.id = message_id
      and messages.sender_id = auth.uid()::text
    )
  );

-- 2. Create storage bucket for message attachments
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'message-attachments',
  'message-attachments',
  true,
  52428800, -- 50 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'application/zip']
)
on conflict (id) do nothing;

-- Allow authenticated users to upload to this bucket
create policy "Authenticated users can upload message attachments"
  on storage.objects
  for insert
  with check (
    bucket_id = 'message-attachments'
    and auth.role() = 'authenticated'
  );

-- Allow public read
create policy "Anyone can read message attachments"
  on storage.objects
  for select
  using (bucket_id = 'message-attachments');

-- Allow users to delete their own uploads
create policy "Users can delete their own message attachments"
  on storage.objects
  for delete
  using (
    bucket_id = 'message-attachments'
    and auth.uid() = owner
  );

-- Enable realtime for message_attachments
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'message_attachments'
  ) then
    alter publication supabase_realtime add table public.message_attachments;
  end if;
end
$$;
