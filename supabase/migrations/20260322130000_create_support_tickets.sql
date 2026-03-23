-- Migration: Create support_tickets table
-- Description: Support ticket system for user assistance
-- Sprint 8: Support utilisateur (contact)

-- Create support_tickets table
CREATE TYPE support_ticket_status AS ENUM ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed');
CREATE TYPE support_ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE support_ticket_category AS ENUM ('technical', 'billing', 'account', 'property', 'booking', 'payment', 'verification', 'other');

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  ticket_number TEXT NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  category support_ticket_category NOT NULL DEFAULT 'other',
  priority support_ticket_priority NOT NULL DEFAULT 'medium',
  status support_ticket_status NOT NULL DEFAULT 'open',
  assigned_to uuid,
  property_id uuid,

  -- Resolution tracking
  resolution TEXT,
  resolved_at timestamp with time zone,
  closed_at timestamp with time zone,
  closed_by uuid,

  -- SLA tracking
  first_response_at timestamp with time zone,
  response_time_minutes integer,

  -- Metadata
  platform text DEFAULT 'web',
  browser_info jsonb DEFAULT '{}'::jsonb,
  attachments jsonb DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),

  CONSTRAINT support_tickets_pkey PRIMARY KEY (id),
  CONSTRAINT support_tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT support_tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT support_tickets_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL,
  CONSTRAINT support_tickets_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX IF NOT EXISTS idx_support_tickets_category ON public.support_tickets(category);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON public.support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_at ON public.support_tickets(created_at DESC);

-- Composite index for ticket queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_status ON public.support_tickets(user_id, status, created_at DESC);

-- Comments
COMMENT ON TABLE public.support_tickets IS 'Support tickets for user assistance and issue tracking';
COMMENT ON COLUMN public.support_tickets.ticket_number IS 'Human-readable ticket number (e.g., SUP-2024-000001)';
COMMENT ON COLUMN public.support_tickets.status IS 'Status: open, in_progress, waiting_customer, resolved, closed';
COMMENT ON COLUMN public.support_tickets.priority IS 'Priority: low, medium, high, urgent';
COMMENT ON COLUMN public.support_tickets.category IS 'Category: technical, billing, account, property, booking, payment, verification, other';

-- RLS Policies
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access support_tickets" ON public.support_tickets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own tickets
CREATE POLICY "Users can view own support_tickets" ON public.support_tickets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create tickets
CREATE POLICY "Users can create support_tickets" ON public.support_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own tickets (limited fields)
CREATE POLICY "Users can update own support_tickets" ON public.support_tickets
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid() AND
    -- Only allow certain fields to be updated by users
    -- (handled by application logic)
    true
  );

-- Support agents can view all tickets
CREATE POLICY "Support agents can view all support_tickets" ON public.support_tickets
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator', 'support_agent')
    )
  );

-- Support agents can update tickets
CREATE POLICY "Support agents can update support_tickets" ON public.support_tickets
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'moderator', 'support_agent')
    )
  )
  WITH CHECK (true);

-- Updated at trigger
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS text AS $$
DECLARE
  ticket_count integer;
  ticket_number text;
BEGIN
  -- Count tickets created this year
  SELECT COUNT(*) INTO ticket_count
  FROM public.support_tickets
  WHERE EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM now());

  -- Generate ticket number: SUP-YYYY-XXXXXX
  ticket_number := 'SUP-' || EXTRACT(YEAR FROM now()) || '-' || LPAD((ticket_count + 1)::text, 6, '0');

  RETURN ticket_number;
END;
$$ LANGUAGE plpgsql;

-- Function to create support ticket
CREATE OR REPLACE FUNCTION create_support_ticket(
  p_user_id uuid,
  p_subject text,
  p_description text,
  p_category support_ticket_category DEFAULT 'other',
  p_priority support_ticket_priority DEFAULT 'medium',
  p_property_id uuid DEFAULT NULL,
  p_attachments jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ticket_number text;
  v_ticket_id uuid;
BEGIN
  -- Generate ticket number
  v_ticket_number := generate_ticket_number();

  -- Create ticket
  INSERT INTO public.support_tickets (
    ticket_number,
    user_id,
    subject,
    description,
    category,
    priority,
    property_id,
    attachments
  )
  VALUES (
    v_ticket_number,
    p_user_id,
    p_subject,
    p_description,
    p_category,
    p_priority,
    p_property_id,
    p_attachments
  )
  RETURNING id INTO v_ticket_id;

  -- Create notification for support team
  INSERT INTO public.notifications (user_id, type, title, message, metadata)
  SELECT
    ur.user_id,
    'new_support_ticket',
    'Nouveau ticket de support',
    'Ticket ' || v_ticket_number || ': ' || p_subject,
    jsonb_build_object(
      'ticket_id', v_ticket_id,
      'ticket_number', v_ticket_number,
      'category', p_category,
      'priority', p_priority
    )
  FROM public.user_roles ur
  WHERE ur.role IN ('admin', 'moderator', 'support_agent');

  RETURN jsonb_build_object(
    'success', true,
    'ticket_id', v_ticket_id,
    'ticket_number', v_ticket_number
  );
END;
$$;

-- Function to update ticket status
CREATE OR REPLACE FUNCTION update_ticket_status(
  p_ticket_id uuid,
  p_status support_ticket_status,
  p_user_id uuid DEFAULT NULL,
  p_resolution text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.support_tickets
  SET
    status = p_status,
    resolution = COALESCE(p_resolution, resolution),
    resolved_at = CASE WHEN p_status = 'resolved' THEN now() ELSE resolved_at END,
    closed_at = CASE WHEN p_status = 'closed' THEN now() ELSE closed_at END,
    closed_by = CASE WHEN p_status = 'closed' THEN p_user_id ELSE closed_by END,
    updated_at = now()
  WHERE id = p_ticket_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Function to assign ticket
CREATE OR REPLACE FUNCTION assign_ticket(
  p_ticket_id uuid,
  p_assigned_to uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.support_tickets
  SET
    assigned_to = p_assigned_to,
    status = 'in_progress',
    first_response_at = COALESCE(first_response_at, now()),
    response_time_minutes = EXTRACT(EPOCH FROM (now() - created_at)) / 60,
    updated_at = now()
  WHERE id = p_ticket_id;

  -- Notify user about assignment
  INSERT INTO public.notifications (user_id, type, title, message, action_url, metadata)
  SELECT
    st.user_id,
    'ticket_assigned',
    'Ticket assigné',
    'Votre ticket ' || st.ticket_number || ' a été assigné à un agent',
    '/support/tickets/' || st.id,
    jsonb_build_object('ticket_id', st.id, 'ticket_number', st.ticket_number)
  FROM public.support_tickets st
  WHERE st.id = p_ticket_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION generate_ticket_number() TO authenticated;
GRANT EXECUTE ON FUNCTION create_support_ticket(uuid, text, text, support_ticket_category, support_ticket_priority, uuid, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION update_ticket_status(uuid, support_ticket_status, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION assign_ticket(uuid, uuid) TO authenticated;

-- Trigger to auto-generate ticket number on insert
CREATE OR REPLACE FUNCTION set_ticket_number()
RETURNS trigger AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS support_tickets_ticket_number_trigger ON public.support_tickets;
CREATE TRIGGER support_tickets_ticket_number_trigger
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION set_ticket_number();
