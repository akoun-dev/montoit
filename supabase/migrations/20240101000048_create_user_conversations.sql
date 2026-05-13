-- Migration: Create user_conversations table
-- Description: User conversations (alternative to conversations table)
-- Order: Forty-eighth table (references profiles, properties)

CREATE TABLE IF NOT EXISTS public.user_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  participant_1_id uuid NOT NULL,
  participant_2_id uuid NOT NULL,
  property_id uuid,
  subject text,
  last_message_preview text,
  last_message_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_conversations_pkey PRIMARY KEY (id),
  CONSTRAINT user_conversations_participant_1_id_fkey FOREIGN KEY (participant_1_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_conversations_participant_2_id_fkey FOREIGN KEY (participant_2_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_conversations_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_conversations_participant_1_id ON public.user_conversations(participant_1_id);
CREATE INDEX IF NOT EXISTS idx_user_conversations_participant_2_id ON public.user_conversations(participant_2_id);
CREATE INDEX IF NOT EXISTS idx_user_conversations_property_id ON public.user_conversations(property_id);
CREATE INDEX IF NOT EXISTS idx_user_conversations_last_message_at ON public.user_conversations(last_message_at);
CREATE INDEX IF NOT EXISTS idx_user_conversations_updated_at ON public.user_conversations(updated_at);

-- Comments
COMMENT ON TABLE public.user_conversations IS 'User conversations (alternative to conversations table)';

-- RLS Policies
ALTER TABLE public.user_conversations ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.user_conversations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view conversations they participate in
CREATE POLICY "Users can view own conversations" ON public.user_conversations
  FOR SELECT
  TO authenticated
  USING (participant_1_id = auth.uid() OR participant_2_id = auth.uid());

-- Users can insert conversations they participate in
CREATE POLICY "Users can insert conversations" ON public.user_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (participant_1_id = auth.uid() OR participant_2_id = auth.uid());

-- Users can update conversations they participate in
CREATE POLICY "Users can update own conversations" ON public.user_conversations
  FOR UPDATE
  TO authenticated
  USING (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
  WITH CHECK (participant_1_id = auth.uid() OR participant_2_id = auth.uid());

-- Updated at trigger
CREATE TRIGGER update_user_conversations_updated_at
  BEFORE UPDATE ON public.user_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
