-- Fix foreign key reference in admin_integration_secrets
-- Remove the foreign key constraint to auth.users

-- Drop the existing table
DROP TABLE IF EXISTS public.admin_integration_secrets CASCADE;

-- Recreate without foreign key to auth.users
CREATE TABLE public.admin_integration_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_name text NOT NULL UNIQUE,
  encrypted_config jsonb NOT NULL,
  created_by uuid NOT NULL, -- No FK to auth.users
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  
  CONSTRAINT valid_integration_name CHECK (
    integration_name IN ('cinetpay', 'brevo', 'azure_face', 'openai', 'mapbox')
  )
);

-- Activer RLS
ALTER TABLE public.admin_integration_secrets ENABLE ROW LEVEL SECURITY;

-- Policy: Seuls les super_admins peuvent accéder
CREATE POLICY "Super admins can manage integration secrets"
ON public.admin_integration_secrets
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- Recréer le trigger
CREATE TRIGGER update_integration_secrets_timestamp
BEFORE UPDATE ON public.admin_integration_secrets
FOR EACH ROW
EXECUTE FUNCTION public.update_integration_secrets_updated_at();