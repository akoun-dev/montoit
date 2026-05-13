-- Migration: Create dispute_messages table
-- Description: Messages within disputes
-- Order: Forty-second table (references disputes, profiles)

CREATE TABLE IF NOT EXISTS public.dispute_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  dispute_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  sender_role text NOT NULL CHECK (sender_role = ANY (ARRAY['tenant'::text, 'owner'::text, 'trust_agent'::text, 'admin'::text])),
  content text NOT NULL,
  attachments text[] DEFAULT '{}'::text[],
  is_internal boolean DEFAULT false,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT dispute_messages_pkey PRIMARY KEY (id),
  CONSTRAINT dispute_messages_dispute_id_fkey FOREIGN KEY (dispute_id) REFERENCES public.disputes(id) ON DELETE CASCADE,
  CONSTRAINT dispute_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_dispute_messages_dispute_id ON public.dispute_messages(dispute_id);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_sender_id ON public.dispute_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_sender_role ON public.dispute_messages(sender_role);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_created_at ON public.dispute_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_dispute_messages_is_internal ON public.dispute_messages(is_internal);

-- Comments
COMMENT ON TABLE public.dispute_messages IS 'Messages within disputes';

-- RLS Policies
ALTER TABLE public.dispute_messages ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.dispute_messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Dispute participants can view non-internal messages
CREATE POLICY "Participants can view dispute messages" ON public.dispute_messages
  FOR SELECT
  TO authenticated
  USING (
    is_internal = false
    AND EXISTS (
      SELECT 1 FROM public.disputes
      WHERE id = dispute_id
      AND (created_by = auth.uid() OR assigned_to = auth.uid() OR escalated_to = auth.uid())
    )
  );

-- Trust agents and admins can view all messages
CREATE POLICY "Trust agents can view all messages" ON public.dispute_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type IN ('admin'::user_type, 'trust_agent'::user_type)
      
    )
  );

-- Dispute participants can insert messages
CREATE POLICY "Participants can insert messages" ON public.dispute_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.disputes
      WHERE id = dispute_id
      AND (created_by = auth.uid() OR assigned_to = auth.uid() OR escalated_to = auth.uid())
    )
  );
