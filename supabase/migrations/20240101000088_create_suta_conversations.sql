-- Migration: Create suta_conversations table
-- Description: SUTA (chatbot) conversation sessions
-- Order: Eighty-eighth table (references profiles)

CREATE TABLE IF NOT EXISTS public.suta_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id text,
  user_id uuid,
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone,
  CONSTRAINT suta_conversations_pkey PRIMARY KEY (id),
  CONSTRAINT suta_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_suta_conversations_session_id ON public.suta_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_suta_conversations_user_id ON public.suta_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_suta_conversations_started_at ON public.suta_conversations(started_at);

-- Comments
COMMENT ON TABLE public.suta_conversations IS 'SUTA (chatbot) conversation sessions';

-- RLS Policies
ALTER TABLE public.suta_conversations ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.suta_conversations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own conversations
CREATE POLICY "Users can view own conversations" ON public.suta_conversations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
