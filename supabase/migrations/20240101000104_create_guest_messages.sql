-- Migration: Create guest_messages table
-- Description: Guest messages for properties (no auth required)
-- Order: One hundred third table (references properties)

CREATE TABLE IF NOT EXISTS public.guest_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text,
  email text,
  phone text,
  property_id uuid,
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT guest_messages_pkey PRIMARY KEY (id),
  CONSTRAINT guest_messages_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_guest_messages_property_id ON public.guest_messages(property_id);
CREATE INDEX IF NOT EXISTS idx_guest_messages_email ON public.guest_messages(email);
CREATE INDEX IF NOT EXISTS idx_guest_messages_created_at ON public.guest_messages(created_at);

-- Comments
COMMENT ON TABLE public.guest_messages IS 'Guest messages for properties (no auth required)';

-- RLS Policies
ALTER TABLE public.guest_messages ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.guest_messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Property owners can view messages for their properties
CREATE POLICY "Owners can view property messages" ON public.guest_messages
  FOR SELECT
  TO authenticated
  USING (
    property_id IN (
      SELECT id FROM public.properties WHERE owner_id = auth.uid()
    )
  );

-- No insert - guest messages are generated via edge function
