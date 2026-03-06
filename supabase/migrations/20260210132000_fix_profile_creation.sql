-- Migration: Fix profile creation for OTP auth
-- Description: Allow nullable email/user_type and create profiles automatically on auth.users insert

-- Allow phone-only signups and deferred role selection
ALTER TABLE public.profiles
  ALTER COLUMN email DROP NOT NULL,
  ALTER COLUMN user_type DROP NOT NULL;

-- Create or replace function to auto-create profiles on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw_role text;
  normalized_role text;
  v_user_type user_type;
  v_full_name text;
BEGIN
  raw_role := COALESCE(NEW.raw_user_meta_data->>'user_type', NEW.raw_user_meta_data->>'role', '');
  normalized_role := lower(trim(raw_role));

  v_user_type := CASE
    WHEN normalized_role IN ('tenant', 'locataire') THEN 'tenant'::user_type
    WHEN normalized_role IN ('owner', 'proprietaire', 'propriétaire') THEN 'owner'::user_type
    WHEN normalized_role IN ('agency', 'agence') THEN 'agency'::user_type
    WHEN normalized_role IN ('trust_agent', 'trust-agent', 'tiers_de_confiance', 'tiers-de-confiance') THEN 'trust_agent'::user_type
    WHEN normalized_role IN ('admin') THEN 'admin'::user_type
    ELSE NULL
  END;

  v_full_name := NULLIF(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), '');

  INSERT INTO public.profiles (id, email, phone, full_name, user_type, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NEW.phone, v_full_name, v_user_type, now(), now())
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      phone = EXCLUDED.phone,
      full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
      user_type = COALESCE(EXCLUDED.user_type, public.profiles.user_type),
      updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
