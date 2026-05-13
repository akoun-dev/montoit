-- Migration: Backfill missing profiles
-- Description: Ensure every auth.users row has a matching profile for scoring and UX

INSERT INTO public.profiles (id, email, phone, full_name, user_type, created_at, updated_at)
SELECT
  u.id,
  u.email,
  u.phone,
  NULLIF(COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', ''), '') AS full_name,
  (
    CASE
      WHEN lower(trim(COALESCE(u.raw_user_meta_data->>'user_type', u.raw_user_meta_data->>'role', ''))) IN (
        'tenant', 'locataire'
      ) THEN 'tenant'
      WHEN lower(trim(COALESCE(u.raw_user_meta_data->>'user_type', u.raw_user_meta_data->>'role', ''))) IN (
        'owner', 'proprietaire'
      ) THEN 'owner'
      WHEN lower(trim(COALESCE(u.raw_user_meta_data->>'user_type', u.raw_user_meta_data->>'role', ''))) IN (
        'agency', 'agence'
      ) THEN 'agency'
      WHEN lower(trim(COALESCE(u.raw_user_meta_data->>'user_type', u.raw_user_meta_data->>'role', ''))) IN (
        'trust_agent', 'trust-agent', 'tiers_de_confiance', 'tiers-de-confiance'
      ) THEN 'trust_agent'
      WHEN lower(trim(COALESCE(u.raw_user_meta_data->>'user_type', u.raw_user_meta_data->>'role', ''))) = 'admin' THEN 'admin'
      ELSE 'tenant'
    END
  )::user_type,
  now(),
  now()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
