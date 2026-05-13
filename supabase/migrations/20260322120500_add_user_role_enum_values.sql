DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role'
      AND e.enumlabel = 'moderator'
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'moderator';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'user_role'
      AND e.enumlabel = 'support_agent'
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'support_agent';
  END IF;
END;
$$;
