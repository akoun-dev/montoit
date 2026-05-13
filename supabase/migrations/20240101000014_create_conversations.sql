-- Migration: Create conversations table
-- Description: Direct messaging conversations between users
-- Order: Fourteenth table (references profiles, properties)

CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  participant1_id uuid NOT NULL,
  participant2_id uuid NOT NULL,
  property_id uuid,
  listing_id uuid,
  last_message_id uuid,
  last_message_at timestamp with time zone,
  is_archived_by_participant1 boolean DEFAULT false,
  is_archived_by_participant2 boolean DEFAULT false,
  unread_count_participant1 integer DEFAULT 0,
  unread_count_participant2 integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT conversations_pkey PRIMARY KEY (id),
  CONSTRAINT conversations_participant1_id_fkey FOREIGN KEY (participant1_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT conversations_participant2_id_fkey FOREIGN KEY (participant2_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT conversations_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL,
  CONSTRAINT conversations_listing_id_fkey FOREIGN KEY (listing_id) REFERENCES public.properties(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_participant1_id ON public.conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2_id ON public.conversations(participant2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_property_id ON public.conversations(property_id);
CREATE INDEX IF NOT EXISTS idx_conversations_listing_id ON public.conversations(listing_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_at ON public.conversations(last_message_at);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON public.conversations(updated_at);

-- Comments
COMMENT ON TABLE public.conversations IS 'Direct messaging conversations between users';

-- RLS Policies
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.conversations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view conversations they participate in
CREATE POLICY "Users can view own conversations" ON public.conversations
  FOR SELECT
  TO authenticated
  USING (participant1_id = auth.uid() OR participant2_id = auth.uid());

-- Users can insert conversations they participate in
CREATE POLICY "Users can insert conversations" ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (participant1_id = auth.uid() OR participant2_id = auth.uid());

-- Users can update conversations they participate in
CREATE POLICY "Users can update own conversations" ON public.conversations
  FOR UPDATE
  TO authenticated
  USING (participant1_id = auth.uid() OR participant2_id = auth.uid())
  WITH CHECK (participant1_id = auth.uid() OR participant2_id = auth.uid());

-- Updated at trigger
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
