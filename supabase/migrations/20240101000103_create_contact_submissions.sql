-- Migration: Create contact_submissions table
-- Description: Contact form submissions
-- Order: One hundred second table (no foreign keys)

CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  subject text,
  message text NOT NULL,
  status text,
  resolved_at timestamp with time zone,
  submitted_at timestamp with time zone DEFAULT now(),
  CONSTRAINT contact_submissions_pkey PRIMARY KEY (id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contact_submissions_email ON public.contact_submissions(email);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON public.contact_submissions(status);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_submitted_at ON public.contact_submissions(submitted_at);

-- Comments
COMMENT ON TABLE public.contact_submissions IS 'Contact form submissions';

-- RLS Policies
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.contact_submissions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins can view all submissions
CREATE POLICY "Admins can view submissions" ON public.contact_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND user_type = 'admin'::user_type
      
    )
  );

-- No insert/update - contact submissions are form-generated
