-- Migration: Create payment_reminders table
-- Description: Payment reminder schedules
-- Order: Seventy-third table (references profiles, lease_contracts, properties)

CREATE TABLE IF NOT EXISTS public.payment_reminders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  contract_id uuid,
  tenant_id uuid,
  property_id uuid,
  reminder_type text NOT NULL CHECK (reminder_type = ANY (ARRAY['rent_due'::text, 'rent_overdue'::text, 'lease_expiry'::text, 'lease_renewal'::text, 'custom'::text])),
  schedule_offset integer NOT NULL DEFAULT 0,
  status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'sent'::text, 'delivered'::text, 'opened'::text, 'failed'::text])),
  channel text CHECK (channel = ANY (ARRAY['email'::text, 'sms'::text, 'both'::text])),
  subject text,
  message text,
  scheduled_date timestamp with time zone NOT NULL,
  sent_date timestamp with time zone,
  opened boolean DEFAULT false,
  opened_date timestamp with time zone,
  click_count integer DEFAULT 0,
  template_id text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT payment_reminders_pkey PRIMARY KEY (id),
  CONSTRAINT payment_reminders_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT payment_reminders_contract_id_fkey FOREIGN KEY (contract_id) REFERENCES public.lease_contracts(id) ON DELETE SET NULL,
  CONSTRAINT payment_reminders_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT payment_reminders_property_id_fkey FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_reminders_owner_id ON public.payment_reminders(owner_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_contract_id ON public.payment_reminders(contract_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_tenant_id ON public.payment_reminders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_property_id ON public.payment_reminders(property_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_reminder_type ON public.payment_reminders(reminder_type);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_status ON public.payment_reminders(status);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_scheduled_date ON public.payment_reminders(scheduled_date);

-- Comments
COMMENT ON TABLE public.payment_reminders IS 'Payment reminder schedules';
COMMENT ON COLUMN public.payment_reminders.reminder_type IS 'Type: rent_due, rent_overdue, lease_expiry, lease_renewal, custom';

-- RLS Policies
ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "Service role full access" ON public.payment_reminders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Property owners can view their reminders
CREATE POLICY "Owners can view own reminders" ON public.payment_reminders
  FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid());

-- Tenants can view reminders sent to them
CREATE POLICY "Tenants can view reminders" ON public.payment_reminders
  FOR SELECT
  TO authenticated
  USING (tenant_id = auth.uid());

-- Updated at trigger
CREATE TRIGGER update_payment_reminders_updated_at
  BEFORE UPDATE ON public.payment_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
