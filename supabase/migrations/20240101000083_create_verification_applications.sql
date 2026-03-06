-- Migration: Create verification_applications table
-- Description: Comprehensive verification applications
-- Order: Eighty-third table (references auth.users, profiles)

CREATE TABLE IF NOT EXISTS public.verification_applications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  dossier_type text NOT NULL CHECK (dossier_type = ANY (ARRAY['tenant'::text, 'owner'::text, 'agency'::text])),
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'in_review'::text, 'approved'::text, 'rejected'::text, 'more_info_requested'::text])),
  verification_status jsonb DEFAULT '{}'::jsonb,
  completion_percentage integer DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  personal_info jsonb DEFAULT '{}'::jsonb,
  financial_info jsonb DEFAULT '{}'::jsonb,
  property_info jsonb DEFAULT '{}'::jsonb,
  documents jsonb DEFAULT '{}'::jsonb,
  assigned_agent_id uuid,
  submitted_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  approved_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT verification_applications_pkey PRIMARY KEY (id),
  CONSTRAINT verification_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT verification_applications_assigned_agent_id_fkey FOREIGN KEY (assigned_agent_id) REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_verification_applications_user_id ON public.verification_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_applications_dossier_type ON public.verification_applications(dossier_type);
CREATE INDEX IF NOT EXISTS idx_verification_applications_status ON public.verification_applications(status);
CREATE INDEX IF NOT EXISTS idx_verification_applications_assigned_agent_id ON public.verification_applications(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_verification_applications_completion_percentage ON public.verification_applications(completion_percentage);
CREATE INDEX IF NOT EXISTS idx_verification_applications_submitted_at ON public.verification_applications(submitted_at);

-- Comments
COMMENT ON TABLE public.verification_applications IS 'Comprehensive verification applications';
COMMENT ON COLUMN public.verification_applications.dossier_type IS 'Type: tenant, owner, agency';
COMMENT ON COLUMN public.verification_applications.status IS 'Status: pending, in_review, approved, rejected, more_info_requested';

-- Helper function to check owner access (bypasses RLS on rental_applications)
CREATE OR REPLACE FUNCTION public.can_owner_view_tenant_dossier(p_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.rental_applications ra
    JOIN public.properties p ON p.id = ra.property_id
    WHERE ra.tenant_id = p_tenant_id
      AND p.owner_id = auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.can_owner_view_tenant_dossier(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_owner_view_tenant_dossier(uuid) TO authenticated;

-- RLS Policies
ALTER TABLE public.verification_applications ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.verification_applications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own applications
CREATE POLICY "Users can view own applications" ON public.verification_applications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Property owners can view tenant applications for their properties
DROP POLICY IF EXISTS "Owners can view tenant verification applications" ON public.verification_applications;
CREATE POLICY "Owners can view tenant verification applications" ON public.verification_applications
  FOR SELECT
  TO authenticated
  USING (
    public.can_owner_view_tenant_dossier(verification_applications.user_id)
  );

-- Trust agents can view all applications
CREATE POLICY "Trust agents can view applications" ON public.verification_applications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type IN ('admin'::user_type, 'trust_agent'::user_type)
      
    )
  );

-- Users can insert their own applications
CREATE POLICY "Users can insert own applications" ON public.verification_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own applications (submit dossier, completion %)
CREATE POLICY "Users can update own applications" ON public.verification_applications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Trust agents can update applications
CREATE POLICY "Trust agents can update applications" ON public.verification_applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type IN ('admin'::user_type, 'trust_agent'::user_type)
      
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type IN ('admin'::user_type, 'trust_agent'::user_type)
      
    )
  );

-- Updated at trigger
CREATE TRIGGER update_verification_applications_updated_at
  BEFORE UPDATE ON public.verification_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
