-- ===================================================================
-- Script de Seed Complet pour Supabase Mon Toit
-- Création des comptes de test pour tous les types d'utilisateurs
-- Basé sur les comptes définis dans docs/USER_ACCOUNTS.md
-- ===================================================================

-- Nettoyage des données existantes
DELETE FROM public.login_attempts;
DELETE FROM public.reviews;
DELETE FROM public.rental_applications;
DELETE FROM public.messages;
DELETE FROM public.leases;
DELETE FROM public.properties;
DELETE FROM public.user_roles;
DELETE FROM public.profiles;
DELETE FROM auth.users WHERE email LIKE '%@test.com' OR email LIKE '%@ci';

-- Désactiver temporairement les triggers pour éviter les conflits
DROP TRIGGER IF EXISTS enforce_admin_roles ON public.profiles;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ===================================================================
-- CRÉATION DES UTILISATEURS DE TEST
-- ===================================================================

-- 1. Compte Locataire
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    phone,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    'locataire@test.com',
    crypt('Test123!', gen_salt('bf')),
    NOW(),
    '+2250101010101',
    '{"full_name": "Marie Konan", "user_type": "locataire"}',
    NOW(),
    NOW()
);

-- 2. Compte Propriétaire
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    phone,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440002',
    'proprietaire@test.com',
    crypt('Test123!', gen_salt('bf')),
    NOW(),
    '+2250707070707',
    '{"full_name": "Jean Kouadio", "user_type": "proprietaire"}',
    NOW(),
    NOW()
);

-- 3. Compte Agence
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    phone,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440003',
    'agence@test.com',
    crypt('Test123!', gen_salt('bf')),
    NOW(),
    '+2250808080808',
    '{"full_name": "Agence Immobilière Abidjan", "user_type": "agence"}',
    NOW(),
    NOW()
);

-- 4. Compte Admin ANSUT
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    phone,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440004',
    'admin@test.com',
    crypt('Admin123!', gen_salt('bf')),
    NOW(),
    '+2250202020202',
    '{"full_name": "Administrateur ANSUT", "user_type": "locataire"}',
    NOW(),
    NOW()
);

-- 5. Compte Super Admin
INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    phone,
    raw_user_meta_data,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440005',
    'super@test.com',
    crypt('Super123!', gen_salt('bf')),
    NOW(),
    '+2250303030303',
    '{"full_name": "Super Administrateur ANSUT", "user_type": "locataire"}',
    NOW(),
    NOW()
);

-- ===================================================================
-- CRÉATION DES PROFILS
-- ===================================================================

INSERT INTO public.profiles (id, full_name, user_type, phone, is_verified, created_at, updated_at)
SELECT
  id,
  raw_user_meta_data->>'full_name',
  raw_user_meta_data->>'user_type',
  phone,
  true, -- Tous les comptes de test sont vérifiés
  created_at,
  updated_at
FROM auth.users
WHERE email IN ('locataire@test.com', 'proprietaire@test.com', 'agence@test.com', 'admin@test.com', 'super@test.com')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  user_type = EXCLUDED.user_type,
  phone = EXCLUDED.phone,
  is_verified = EXCLUDED.is_verified,
  updated_at = EXCLUDED.updated_at;

-- ===================================================================
-- CRÉATION DES RÔLES UTILISATEURS
-- ===================================================================

INSERT INTO public.user_roles (user_id, role) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'user'), -- locataire
  ('550e8400-e29b-41d4-a716-446655440002', 'user'), -- proprietaire
  ('550e8400-e29b-41d4-a716-446655440003', 'agent'), -- agence
  ('550e8400-e29b-41d4-a716-446655440004', 'admin'), -- admin
  ('550e8400-e29b-41d4-a716-446655440005', 'super_admin') -- super admin
ON CONFLICT (user_id, role) DO NOTHING;

-- ===================================================================
-- CRÉATION DES BIENS IMMOBILIERS DE TEST
-- ===================================================================

-- Bien pour le propriétaire
INSERT INTO public.properties (
    id,
    title,
    description,
    property_type,
    city,
    neighborhood,
    address,
    monthly_rent,
    deposit_amount,
    surface_area,
    bedrooms,
    bathrooms,
    is_furnished,
    has_ac,
    has_parking,
    status,
    view_count,
    created_at,
    updated_at,
    owner_id,
    latitude,
    longitude
) VALUES (
    '550e8400-e29b-41d4-a716-446655440101',
    'Appartement T3 moderne à Cocody',
    'Bel appartement T3 dans un quartier résidentiel calme et sécurisé. Proche des commerces et écoles.',
    'appartement',
    'Abidjan',
    'Cocody',
    'Rue du Pacifique, Cocody',
    150000,
    300000,
    85,
    3,
    2,
    true,
    true,
    true,
    'disponible',
    25,
    NOW(),
    NOW(),
    '550e8400-e29b-41d4-a716-446655440002',
    5.35995,
    -3.99027
);

-- Bien pour l'agence
INSERT INTO public.properties (
    id,
    title,
    description,
    property_type,
    city,
    neighborhood,
    address,
    monthly_rent,
    deposit_amount,
    surface_area,
    bedrooms,
    bathrooms,
    is_furnished,
    has_ac,
    has_parking,
    status,
    view_count,
    created_at,
    updated_at,
    owner_id,
    latitude,
    longitude
) VALUES (
    '550e8400-e29b-41d4-a716-446655440102',
    'Villa 4 chambres à Riviera',
    'Superbe villa avec jardin et piscine. Idéale pour une famille. Quartier calme et sécurisé.',
    'villa',
    'Abidjan',
    'Riviera',
    'Route des Princes, Riviera',
    350000,
    700000,
    250,
    4,
    3,
    true,
    true,
    true,
    'disponible',
    42,
    NOW(),
    NOW(),
    '550e8400-e29b-41d4-a716-446655440003',
    5.36844,
    -4.00883
);

-- ===================================================================
-- CRÉATION DES CANDIDATURES DE TEST
-- ===================================================================

INSERT INTO public.rental_applications (
    id,
    property_id,
    applicant_id,
    status,
    cover_letter,
    application_score,
    created_at,
    updated_at
) VALUES (
    '550e8400-e29b-41d4-a716-446655440201',
    '550e8400-e29b-41d4-a716-446655440101',
    '550e8400-e29b-41d4-a716-446655440001',
    'pending',
    'Bonjour, je suis très intéressée par votre appartement. Je suis employée dans une entreprise de télécommunications et je peux fournir toutes les garanties nécessaires.',
    85,
    NOW(),
    NOW()
);

-- ===================================================================
-- CRÉATION DES MESSAGES DE TEST
-- ===================================================================

INSERT INTO public.messages (
    id,
    sender_id,
    receiver_id,
    content,
    is_read,
    created_at
) VALUES
('550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'Bonjour, je souhaite visiter votre appartement T3 à Cocody. Quand seriez-vous disponible ?', false, NOW()),
('550e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 'Bonjour Marie, je suis disponible samedi après-midi ou dimanche matin. Quelle préférez-vous ?', true, NOW());

-- ===================================================================
-- RÉACTIVATION DES TRIGGERS
-- ===================================================================

CREATE TRIGGER enforce_admin_roles
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_admin_in_user_type();

-- Création du trigger on_auth_user_created s'il n'existe pas
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, user_type, phone)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'user_type',
    NEW.phone
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- ===================================================================
-- RAPPORT DE CRÉATION
-- ===================================================================

SELECT 'UTILISATEURS CRÉÉS AVEC SUCCÈS' as status,
       COUNT(*) as nombre_utilisateurs
FROM auth.users
WHERE email LIKE '%@test.com' OR email LIKE '%@ci';

SELECT 'PROFILS CRÉÉS AVEC SUCCÈS' as status,
       COUNT(*) as nombre_profils
FROM public.profiles
WHERE id IN (SELECT id FROM auth.users WHERE email LIKE '%@test.com' OR email LIKE '%@ci');

SELECT 'BIENS CRÉÉS AVEC SUCCÈS' as status,
       COUNT(*) as nombre_biens
FROM public.properties
WHERE owner_id IN (SELECT id FROM auth.users WHERE email LIKE '%@test.com' OR email LIKE '%@ci');

SELECT 'CANDIDATURES CRÉÉES AVEC SUCCÈS' as status,
       COUNT(*) as nombre_candidatures
FROM public.rental_applications
WHERE applicant_id IN (SELECT id FROM auth.users WHERE email LIKE '%@test.com' OR email LIKE '%@ci');

SELECT 'BASE DE DONNÉES PRÊTE POUR LES TESTS' as status;

-- ===================================================================
-- INFORMATIONS DE CONNEXION
-- ===================================================================

-- Locataire: locataire@test.com / Test123!
-- Propriétaire: proprietaire@test.com / Test123!
-- Agence: agence@test.com / Test123!
-- Admin: admin@test.com / Admin123!
-- Super Admin: super@test.com / Super123!