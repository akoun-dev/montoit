-- Migration simplifiée pour créer les utilisateurs de test
-- Contournement du trigger d'admin en créant directement les profils et rôles

-- Désactiver temporairement le trigger sur profiles
DROP TRIGGER IF EXISTS enforce_admin_roles ON public.profiles;

-- Créer le locataire
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, phone, raw_user_meta_data, created_at, updated_at)
VALUES ('550e8400-e29b-41d4-a716-446655440001', 'locataire@test.com', crypt('Test123', gen_salt('bf')), NOW(), '+2250101010101', '{"full_name": "Marie Konan", "user_type": "locataire"}', NOW(), NOW());

-- Créer le proprietaire
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, phone, raw_user_meta_data, created_at, updated_at)
VALUES ('550e8400-e29b-41d4-a716-446655440002', 'proprietaire@test.com', crypt('Test123', gen_salt('bf')), NOW(), '+2250707070707', '{"full_name": "Jean Kouadio", "user_type": "proprietaire"}', NOW(), NOW());

-- Créer l'agence
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, phone, raw_user_meta_data, created_at, updated_at)
VALUES ('550e8400-e29b-41d4-a716-446655440003', 'agence@test.com', crypt('Test123', gen_salt('bf')), NOW(), '+2250808080808', '{"full_name": "Agence Immobilière Abidjan", "user_type": "agence"}', NOW(), NOW());

-- Créer l'admin (avec user_type normal, le rôle sera géré via user_roles)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, phone, raw_user_meta_data, created_at, updated_at)
VALUES ('550e8400-e29b-41d4-a716-446655440004', 'admin@test.com', crypt('Admin123', gen_salt('bf')), NOW(), '+2250202020202', '{"full_name": "Administrateur ANSUT", "user_type": "locataire"}', NOW(), NOW());

-- Créer le super admin (avec user_type normal, le rôle sera géré via user_roles)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, phone, raw_user_meta_data, created_at, updated_at)
VALUES ('550e8400-e29b-41d4-a716-446655440005', 'super@test.com', crypt('Super123', gen_salt('bf')), NOW(), '+2250303030303', '{"full_name": "Super Administrateur ANSUT", "user_type": "locataire"}', NOW(), NOW());

-- Créer les profils manuellement pour éviter les triggers
INSERT INTO public.profiles (id, full_name, user_type, phone, created_at, updated_at)
SELECT
  id,
  raw_user_meta_data->>'full_name',
  raw_user_meta_data->>'user_type',
  phone,
  created_at,
  updated_at
FROM auth.users
WHERE email IN ('locataire@test.com', 'proprietaire@test.com', 'agence@test.com', 'admin@test.com', 'super@test.com')
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  user_type = EXCLUDED.user_type,
  phone = EXCLUDED.phone,
  updated_at = EXCLUDED.updated_at;

-- Créer les rôles appropriés dans user_roles
INSERT INTO public.user_roles (user_id, role) VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'user'), -- locataire
  ('550e8400-e29b-41d4-a716-446655440002', 'user'), -- proprietaire
  ('550e8400-e29b-41d4-a716-446655440003', 'agent'), -- agence
  ('550e8400-e29b-41d4-a716-446655440004', 'admin'), -- admin
  ('550e8400-e29b-41d4-a716-446655440005', 'super_admin') -- super admin
ON CONFLICT (user_id, role) DO NOTHING;

-- Réactiver le trigger
CREATE TRIGGER enforce_admin_roles
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_admin_in_user_type();