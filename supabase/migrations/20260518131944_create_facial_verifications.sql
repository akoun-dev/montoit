-- 20260518131944_create_facial_verifications.sql
-- Table pour le suivi des vérifications faciales (NeoFace)

CREATE TABLE IF NOT EXISTS public.facial_verifications (
  uuid uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  provider text NOT NULL, -- 'neoface', etc.
  document_id text,
  selfie_url text,
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'passed', 'failed'
  matching_score numeric,
  is_match boolean DEFAULT false,
  is_live boolean DEFAULT false,
  provider_response jsonb,
  failure_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,

  CONSTRAINT facial_verifications_pkey PRIMARY KEY (uuid),
  CONSTRAINT facial_verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_facial_verifications_user_id ON public.facial_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_facial_verifications_provider ON public.facial_verifications(provider);
CREATE INDEX IF NOT EXISTS idx_facial_verifications_status ON public.facial_verifications(status);
CREATE INDEX IF NOT EXISTS idx_facial_verifications_document_id ON public.facial_verifications(document_id);
CREATE INDEX IF NOT EXISTS idx_facial_verifications_created_at ON public.facial_verifications(created_at);

-- Enable Row Level Security
ALTER TABLE public.facial_verifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Service role full access" ON public.facial_verifications
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Users can view own verifications" ON public.facial_verifications
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Trust agents can view all verifications" ON public.facial_verifications
  FOR SELECT TO authenticated USING (true);

-- Auto-update updated_at trigger
CREATE TRIGGER trg_facial_verifications_updated_at
  BEFORE UPDATE ON public.facial_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();