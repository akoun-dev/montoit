-- Migration: Create suta_messages table
-- Description: SUTA chatbot messages
-- Order: Eighty-ninth table (references suta_conversations)

CREATE TABLE IF NOT EXISTS public.suta_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid,
  role text NOT NULL,
  content text NOT NULL,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT suta_messages_pkey PRIMARY KEY (id),
  CONSTRAINT suta_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.suta_conversations(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_suta_messages_conversation_id ON public.suta_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_suta_messages_role ON public.suta_messages(role);
CREATE INDEX IF NOT EXISTS idx_suta_messages_created_at ON public.suta_messages(created_at);

-- Comments
COMMENT ON TABLE public.suta_messages IS 'SUTA chatbot messages';

-- RLS Policies
ALTER TABLE public.suta_messages ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.suta_messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view messages in their own conversations
CREATE POLICY "Users can view messages in own conversations" ON public.suta_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.suta_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );
