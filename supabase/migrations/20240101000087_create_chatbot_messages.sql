-- Migration: Create chatbot_messages table
-- Description: Messages within chatbot conversations
-- Order: Eighty-seventh table (references chatbot_conversations)

CREATE TABLE IF NOT EXISTS public.chatbot_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  role chatbot_conversation_status NOT NULL,
  content text NOT NULL,
  content_type text DEFAULT 'text'::text,
  metadata jsonb DEFAULT '{}'::jsonb,
  token_count integer,
  is_read boolean DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chatbot_messages_pkey PRIMARY KEY (id),
  CONSTRAINT chatbot_messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.chatbot_conversations(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_conversation_id ON public.chatbot_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_role ON public.chatbot_messages(role);
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_created_at ON public.chatbot_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_is_read ON public.chatbot_messages(is_read);

-- Comments
COMMENT ON TABLE public.chatbot_messages IS 'Messages within chatbot conversations';
COMMENT ON COLUMN public.chatbot_messages.role IS 'Role: active, archived, closed (represents user or bot)';
COMMENT ON COLUMN public.chatbot_messages.content_type IS 'Content type: text, image, etc.';

-- RLS Policies
ALTER TABLE public.chatbot_messages ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.chatbot_messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view messages in their own conversations
CREATE POLICY "Users can view messages in own conversations" ON public.chatbot_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chatbot_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );

-- Users can insert messages in their own conversations
CREATE POLICY "Users can insert messages in own conversations" ON public.chatbot_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chatbot_conversations
      WHERE id = conversation_id AND user_id = auth.uid()
    )
  );
