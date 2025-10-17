-- Phase 1: Infrastructure Supabase pour Mon Toit

-- ========================================
-- 1. ENUM pour les types d'utilisateurs
-- ========================================
CREATE TYPE public.user_type AS ENUM ('locataire', 'proprietaire', 'agence', 'admin_ansut');

-- ENUM pour les rôles (système de permissions séparé)
CREATE TYPE public.app_role AS ENUM ('admin', 'user', 'agent', 'moderator');

-- ========================================
-- 2. TABLE PROFILES
-- ========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  user_type public.user_type NOT NULL DEFAULT 'locataire',
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  bio TEXT,
  city TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  oneci_verified BOOLEAN DEFAULT FALSE,
  cnam_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX idx_profiles_user_type ON public.profiles(user_type);
CREATE INDEX idx_profiles_city ON public.profiles(city);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour profiles
CREATE POLICY "Profiles sont visibles par tous les utilisateurs authentifiés"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Utilisateurs peuvent voir leur propre profil (public)"
  ON public.profiles FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Utilisateurs peuvent mettre à jour leur propre profil"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Création automatique du profil"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ========================================
-- 3. TABLE USER ROLES (Sécurité)
-- ========================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies pour user_roles
CREATE POLICY "Utilisateurs peuvent voir leurs propres rôles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ========================================
-- 4. FONCTION SÉCURISÉE has_role()
-- ========================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- ========================================
-- 5. TRIGGER pour auto-création profil
-- ========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Nouvel utilisateur'),
    COALESCE((NEW.raw_user_meta_data->>'user_type')::public.user_type, 'locataire')
  );
  
  -- Attribuer le rôle 'user' par défaut
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- 6. FONCTION pour mise à jour updated_at
-- ========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- 7. STORAGE BUCKETS
-- ========================================

-- Bucket pour avatars (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
);

-- Bucket pour images de propriétés (public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'property-images',
  'property-images',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Bucket pour documents utilisateurs (privé)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-documents',
  'user-documents',
  false,
  52428800, -- 50MB
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
);

-- ========================================
-- 8. STORAGE RLS POLICIES
-- ========================================

-- Policies pour avatars
CREATE POLICY "Avatars publiquement accessibles"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Utilisateurs peuvent uploader leur avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Utilisateurs peuvent mettre à jour leur avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Utilisateurs peuvent supprimer leur avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Policies pour property-images
CREATE POLICY "Images de propriétés publiquement accessibles"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'property-images');

CREATE POLICY "Propriétaires peuvent uploader images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'property-images');

CREATE POLICY "Propriétaires peuvent mettre à jour images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'property-images');

CREATE POLICY "Propriétaires peuvent supprimer images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'property-images');

-- Policies pour user-documents
CREATE POLICY "Utilisateurs peuvent voir leurs propres documents"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'user-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Utilisateurs peuvent uploader leurs documents"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'user-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Utilisateurs peuvent supprimer leurs documents"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'user-documents' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );