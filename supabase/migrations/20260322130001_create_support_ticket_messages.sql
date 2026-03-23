-- Migration: Create support_ticket_messages table
-- Description: Messages for support tickets
-- Sprint 8: Support utilisateur (contact)

CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  is_internal boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),

  CONSTRAINT support_ticket_messages_pkey PRIMARY KEY (id),
  CONSTRAINT support_ticket_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  CONSTRAINT support_ticket_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_ticket_id ON public.support_ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_sender_id ON public.support_ticket_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_created_at ON public.support_ticket_messages(created_at DESC);

-- Comments
COMMENT ON TABLE public.support_ticket_messages IS 'Messages exchanged for support tickets';
COMMENT ON COLUMN public.support_ticket_messages.is_internal IS 'Internal messages are only visible to support agents';

-- RLS Policies
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access support_ticket_messages" ON public.support_ticket_messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view messages for their own tickets
CREATE POLICY "Users can view own ticket messages" ON public.support_ticket_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE id = ticket_id AND user_id = auth.uid()
    )
  );

-- Users can insert messages for their own tickets
CREATE POLICY "Users can insert messages for own tickets" ON public.support_ticket_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_internal = false AND
    EXISTS (
      SELECT 1 FROM public.support_tickets
      WHERE id = ticket_id AND user_id = auth.uid()
    )
  );

-- Support agents can view all messages
CREATE POLICY "Support agents can view all support_ticket_messages" ON public.support_ticket_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator', 'support_agent')
    )
  );

-- Support agents can insert internal messages
CREATE POLICY "Support agents can insert support_ticket_messages" ON public.support_ticket_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator', 'support_agent')
    )
  );
