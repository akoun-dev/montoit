-- Migration: Create cev_requests table
-- Description: CEV service request logs
-- Order: Eighty-fifth table (references profiles, properties)

CREATE TABLE IF NOT EXISTS public.cev_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  property_id uuid,
  status text,
  request_payload jsonb,
  response_payload jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT cev_requests_pkey PRIMARY KEY (id),
  CONSTRAINT cev_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT cev_requests_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cev_requests_user_id ON public.cev_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_cev_requests_property_id ON public.cev_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_cev_requests_status ON public.cev_requests(status);
CREATE INDEX IF NOT EXISTS idx_cev_requests_created_at ON public.cev_requests(created_at);

-- Comments
COMMENT ON TABLE public.cev_requests IS 'CEV service request logs';

-- RLS Policies
ALTER TABLE public.cev_requests ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.cev_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own requests
CREATE POLICY "Users can view own requests" ON public.cev_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Trust agents can view all requests
CREATE POLICY "Trust agents can view requests" ON public.cev_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type IN ('admin'::user_type, 'trust_agent'::user_type)
      
    )
  );

-- No insert/update - CEV requests are system-generated

-- Updated at trigger
CREATE TRIGGER update_cev_requests_updated_at
  BEFORE UPDATE ON public.cev_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
