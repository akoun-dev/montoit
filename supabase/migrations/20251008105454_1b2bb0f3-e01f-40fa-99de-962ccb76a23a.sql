-- Créer les tables pour Sarah, l'assistante virtuelle Mon Toit
CREATE TABLE public.sarah_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id UUID NOT NULL DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.sarah_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.sarah_conversations(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX idx_sarah_conversations_user_id ON public.sarah_conversations(user_id);
CREATE INDEX idx_sarah_conversations_session_id ON public.sarah_conversations(session_id);
CREATE INDEX idx_sarah_messages_conversation_id ON public.sarah_messages(conversation_id);

-- Activer RLS
ALTER TABLE public.sarah_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sarah_messages ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour sarah_conversations
CREATE POLICY "Users can view their own conversations"
  ON public.sarah_conversations FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can create conversations"
  ON public.sarah_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own conversations"
  ON public.sarah_conversations FOR UPDATE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Politiques RLS pour sarah_messages
CREATE POLICY "Users can view their own messages"
  ON public.sarah_messages FOR SELECT
  USING (
    conversation_id IN (
      SELECT id FROM public.sarah_conversations 
      WHERE user_id = auth.uid() OR user_id IS NULL
    )
  );

CREATE POLICY "Users can insert their own messages"
  ON public.sarah_messages FOR INSERT
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM public.sarah_conversations 
      WHERE user_id = auth.uid() OR user_id IS NULL
    )
  );

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION public.update_sarah_conversation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sarah_conversations_updated_at
  BEFORE UPDATE ON public.sarah_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_sarah_conversation_updated_at();