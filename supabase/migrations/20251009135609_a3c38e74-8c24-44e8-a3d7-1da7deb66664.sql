-- ============================================
-- MIGRATION: Table user_active_roles - Bascule de rôles user_type
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_active_roles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  available_roles user_type[] NOT NULL DEFAULT ARRAY[]::user_type[],
  "current_role" user_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_active_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own active roles"
  ON public.user_active_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own active roles"
  ON public.user_active_roles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert active roles"
  ON public.user_active_roles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all active roles"
  ON public.user_active_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.initialize_user_active_roles()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_active_roles (user_id, available_roles, "current_role")
  VALUES (NEW.id, ARRAY[NEW.user_type]::user_type[], NEW.user_type)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_initialize_roles ON public.profiles;
CREATE TRIGGER on_profile_created_initialize_roles
  AFTER INSERT ON public.profiles FOR EACH ROW
  EXECUTE FUNCTION public.initialize_user_active_roles();

CREATE OR REPLACE FUNCTION public.add_available_role(p_user_id UUID, p_new_role user_type)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() != p_user_id AND NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE public.user_active_roles
  SET available_roles = array_append(available_roles, p_new_role), updated_at = now()
  WHERE user_id = p_user_id AND NOT (p_new_role = ANY(available_roles));
  INSERT INTO public.admin_audit_logs (admin_id, action_type, target_type, target_id, notes)
  VALUES (auth.uid(), 'role_added', 'user', p_user_id, 'Ajout du rôle : ' || p_new_role::text);
END;
$$;

INSERT INTO public.user_active_roles (user_id, available_roles, "current_role")
SELECT p.id, ARRAY[p.user_type]::user_type[], p.user_type
FROM public.profiles p
WHERE NOT EXISTS (SELECT 1 FROM public.user_active_roles uar WHERE uar.user_id = p.id)
ON CONFLICT (user_id) DO NOTHING;