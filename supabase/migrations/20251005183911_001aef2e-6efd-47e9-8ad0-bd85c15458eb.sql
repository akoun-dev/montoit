-- Fix CRITICAL security vulnerability: Remove public access to profiles table
-- This policy allows anonymous (unauthenticated) users to read all profile data
-- including full names, phone numbers, cities, and verification status

DROP POLICY IF EXISTS "Utilisateurs peuvent voir leur propre profil (public)" ON public.profiles;

-- Note: The policy "Profiles sont visibles par tous les utilisateurs authentifiés" 
-- remains active and correctly restricts profile access to authenticated users only.
-- This is the proper security posture for a rental platform where users need to 
-- view each other's profiles during property searches and applications.