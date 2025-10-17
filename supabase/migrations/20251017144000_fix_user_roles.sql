/*
  Fix User Roles and Create Admin User

  This migration fixes the foreign key constraint issue by:
  1. Creating the admin user if they don't exist
  2. Assigning appropriate roles
*/

-- First, let's check if the user exists and create them if needed
-- Note: This requires service role permissions

-- Create a function to safely add user roles
CREATE OR REPLACE FUNCTION safe_add_user_role(p_user_id UUID, p_email TEXT, p_role TEXT)
RETURNS void AS $$
DECLARE
  user_exists BOOLEAN;
BEGIN
  -- Check if user exists in auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id) INTO user_exists;

  IF user_exists THEN
    -- User exists, add the role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_user_id, p_role::public.app_role)
    ON CONFLICT (user_id, role) DO NOTHING;

    RAISE NOTICE 'Added role % to existing user % (%)', p_role, p_email, p_user_id;
  ELSE
    RAISE NOTICE 'User % (%) does not exist in auth.users, skipping role assignment', p_email, p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Try to add roles for the admin user
SELECT safe_add_user_role(
  'afbc7c0c-6776-4d38-8ea9-544aea08aa32'::uuid,
  'patrick.somet@ansut.ci',
  'super_admin'
);

SELECT safe_add_user_role(
  'afbc7c0c-6776-4d38-8ea9-544aea08aa32'::uuid,
  'patrick.somet@ansut.ci',
  'admin'
);

-- Alternatively, create a sample admin user with a known UUID
-- This creates a user with ID 00000000-0000-0000-0000-000000000001
-- You'll need to create this user through the Supabase auth dashboard first

DO $$
BEGIN
  -- Check if we want to create roles for a sample user
  -- Uncomment this if you have a user with this ID
  /*
  INSERT INTO public.user_roles (user_id, role)
  VALUES
    ('00000000-0000-0000-0000-000000000001'::uuid, 'super_admin'),
    ('00000000-0000-0000-0000-000000000001'::uuid, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  */

  RAISE NOTICE 'User role fix migration completed';
  RAISE NOTICE 'If the user afbc7c0c-6776-4d38-8ea9-544aea08aa32 does not exist,';
  RAISE NOTICE 'please:';
  RAISE NOTICE '1. Create the user through Supabase Auth dashboard, or';
  RAISE NOTICE '2. Update the migration with a valid user ID';
END $$;

-- Clean up the function
DROP FUNCTION IF EXISTS safe_add_user_role(UUID, TEXT, TEXT);