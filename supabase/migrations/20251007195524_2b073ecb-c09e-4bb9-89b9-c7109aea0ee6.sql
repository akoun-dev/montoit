-- Phase 2: CryptoNeo Electronic Signatures Database Schema

-- 1. Create digital_certificates table
CREATE TABLE IF NOT EXISTS public.digital_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  certificate_id TEXT NOT NULL UNIQUE,
  certificate_data JSONB NOT NULL,
  certificate_status TEXT DEFAULT 'active' CHECK (certificate_status IN ('active', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_digital_certificates_user_id ON public.digital_certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_digital_certificates_status ON public.digital_certificates(certificate_status);
CREATE INDEX IF NOT EXISTS idx_digital_certificates_expires_at ON public.digital_certificates(expires_at);

-- RLS Policies
ALTER TABLE public.digital_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own certificates"
  ON public.digital_certificates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all certificates"
  ON public.digital_certificates FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "System can insert certificates"
  ON public.digital_certificates FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update certificates"
  ON public.digital_certificates FOR UPDATE
  USING (true);

-- 2. Add CryptoNeo columns to existing leases table
ALTER TABLE public.leases 
  ADD COLUMN IF NOT EXISTS cryptoneo_operation_id TEXT,
  ADD COLUMN IF NOT EXISTS landlord_signature_operation_id TEXT,
  ADD COLUMN IF NOT EXISTS tenant_signature_operation_id TEXT,
  ADD COLUMN IF NOT EXISTS signed_document_url TEXT,
  ADD COLUMN IF NOT EXISTS landlord_cryptoneo_signature_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS tenant_cryptoneo_signature_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_electronically_signed BOOLEAN DEFAULT false;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_leases_cryptoneo_operation ON public.leases(cryptoneo_operation_id) WHERE cryptoneo_operation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leases_electronic_signed ON public.leases(is_electronically_signed) WHERE is_electronically_signed = true;
CREATE INDEX IF NOT EXISTS idx_leases_landlord_signature_op ON public.leases(landlord_signature_operation_id) WHERE landlord_signature_operation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leases_tenant_signature_op ON public.leases(tenant_signature_operation_id) WHERE tenant_signature_operation_id IS NOT NULL;

-- 3. Create electronic_signature_logs table
CREATE TABLE IF NOT EXISTS public.electronic_signature_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lease_id UUID REFERENCES public.leases(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  operation_id TEXT NOT NULL,
  signature_type TEXT CHECK (signature_type IN ('landlord', 'tenant', 'both')),
  status TEXT DEFAULT 'initiated' CHECK (status IN ('initiated', 'in_progress', 'completed', 'failed')),
  error_message TEXT,
  cryptoneo_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_signature_logs_operation_id ON public.electronic_signature_logs(operation_id);
CREATE INDEX IF NOT EXISTS idx_signature_logs_lease_id ON public.electronic_signature_logs(lease_id);
CREATE INDEX IF NOT EXISTS idx_signature_logs_status ON public.electronic_signature_logs(status);
CREATE INDEX IF NOT EXISTS idx_signature_logs_user_id ON public.electronic_signature_logs(user_id);

-- RLS Policies
ALTER TABLE public.electronic_signature_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own signature logs"
  ON public.electronic_signature_logs FOR SELECT
  USING (
    auth.uid() = user_id OR 
    lease_id IN (
      SELECT id FROM public.leases 
      WHERE landlord_id = auth.uid() OR tenant_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all signature logs"
  ON public.electronic_signature_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "System can insert signature logs"
  ON public.electronic_signature_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update signature logs"
  ON public.electronic_signature_logs FOR UPDATE
  USING (true);

-- 4. Trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_electronic_signature_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_digital_certificates_updated_at
  BEFORE UPDATE ON public.digital_certificates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_electronic_signature_updated_at();

CREATE TRIGGER update_signature_logs_updated_at
  BEFORE UPDATE ON public.electronic_signature_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_electronic_signature_updated_at();