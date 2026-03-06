-- Migration: Create suta_feedback table
-- Description: SUTA chatbot user feedback
-- Order: Ninety-first table (references chatbot_conversations)

CREATE TABLE IF NOT EXISTS public.suta_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  conversation_id uuid,
  message_id text NOT NULL,
  question text NOT NULL,
  response text NOT NULL,
  rating text NOT NULL,
  feedback_text text,
  session_id text,
  user_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT suta_feedback_pkey PRIMARY KEY (id),
  CONSTRAINT suta_feedback_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.chatbot_conversations(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_suta_feedback_conversation_id ON public.suta_feedback(conversation_id);
CREATE INDEX IF NOT EXISTS idx_suta_feedback_user_id ON public.suta_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_suta_feedback_rating ON public.suta_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_suta_feedback_created_at ON public.suta_feedback(created_at);

-- Comments
COMMENT ON TABLE public.suta_feedback IS 'SUTA chatbot user feedback';

-- RLS Policies
ALTER TABLE public.suta_feedback ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.suta_feedback
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback" ON public.suta_feedback
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can view all feedback
CREATE POLICY "Admins can view all feedback" ON public.suta_feedback
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type = 'admin'::user_type
      
    )
  );
