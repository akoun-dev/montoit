-- Migration: Create chatbot_conversations table
-- Description: Chatbot conversation sessions
-- Order: Eighty-sixth table (references profiles, properties, rental_applications)

CREATE TABLE IF NOT EXISTS public.chatbot_conversations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_id text UNIQUE,
  title text,
  status chatbot_conversation_status DEFAULT 'active'::chatbot_conversation_status,
  type chatbot_conversation_type DEFAULT 'general'::chatbot_conversation_type,
  message_count integer DEFAULT 0,
  last_message_at timestamp with time zone,
  property_id uuid,
  application_id uuid,
  context_data jsonb DEFAULT '{}'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  tags text[] DEFAULT '{}'::text[],
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  archived_at timestamp with time zone,
  CONSTRAINT chatbot_conversations_pkey PRIMARY KEY (id),
  CONSTRAINT chatbot_conversations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT chatbot_conversations_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL,
  CONSTRAINT chatbot_conversations_application_id_fkey FOREIGN KEY (application_id) REFERENCES public.rental_applications(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_user_id ON public.chatbot_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_session_id ON public.chatbot_conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_status ON public.chatbot_conversations(status);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_type ON public.chatbot_conversations(type);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_property_id ON public.chatbot_conversations(property_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_application_id ON public.chatbot_conversations(application_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_tags ON public.chatbot_conversations USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_created_at ON public.chatbot_conversations(created_at);

-- Comments
COMMENT ON TABLE public.chatbot_conversations IS 'Chatbot conversation sessions';

-- RLS Policies
ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.chatbot_conversations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own conversations
CREATE POLICY "Users can view own conversations" ON public.chatbot_conversations
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own conversations
CREATE POLICY "Users can insert own conversations" ON public.chatbot_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own conversations
CREATE POLICY "Users can update own conversations" ON public.chatbot_conversations
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Updated at trigger
CREATE TRIGGER update_chatbot_conversations_updated_at
  BEFORE UPDATE ON public.chatbot_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
